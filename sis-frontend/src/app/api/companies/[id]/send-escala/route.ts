// src/app/api/companies/[id]/send-escala/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEscalaEmails } from '@/lib/email/sendEscala';

type RouteParams = { id: string };

function isValidEmail(email?: string | null) {
  if (!email) return false;
  return /\S+@\S+\.\S+/.test(email);
}

function buildBaseUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000';

  if (!fromEnv.startsWith('http://') && !fromEnv.startsWith('https://')) {
    return `https://${fromEnv}`;
  }
  return fromEnv;
}

/**
 * Gera o link público da escala de acordo com a sua página:
 *   /web/escala?escala=<idEscala>&empresa=<idEmpresa>
 */
function buildEscalaLink(params: {
  baseUrl: string;
  escalaId: number;
  empresaId: number;
}) {
  const { baseUrl, escalaId, empresaId } = params;

  try {
    const url = new URL('/web/escala', baseUrl);
    url.searchParams.set('escala', String(escalaId));
    url.searchParams.set('empresa', String(empresaId));
    return url.toString();
  } catch {
    // fallback se o new URL der erro por algum motivo
    return `${baseUrl.replace(
      /\/$/,
      '',
    )}/web/escala?escala=${escalaId}&empresa=${empresaId}`;
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
) {
  try {
    const resolved = await context.params;
    const companyId = Number(resolved.id);

    if (Number.isNaN(companyId) || companyId <= 0) {
      return NextResponse.json(
        { message: 'ID da empresa inválido.' },
        { status: 400 },
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const message =
      typeof body?.message === 'string' ? body.message.trim() : '';

    // employeeId continua existindo APENAS para filtrar quem recebe
    const rawEmployeeId = body?.employeeId;
    let employeeId: number | undefined;
    if (
      rawEmployeeId !== undefined &&
      rawEmployeeId !== null &&
      rawEmployeeId !== ''
    ) {
      const n = Number(rawEmployeeId);
      if (Number.isNaN(n) || n <= 0) {
        return NextResponse.json(
          { message: 'Funcionário inválido.' },
          { status: 400 },
        );
      }
      employeeId = n;
    }

    // 1) Empresa
    const empresa = await prisma.empresa.findUnique({
      where: { id: companyId },
    });

    if (!empresa) {
      return NextResponse.json(
        { message: 'Empresa não encontrada.' },
        { status: 404 },
      );
    }

    // 2) Escala vinculada via EscalaHasEmpresa
    const vinculo = await prisma.escalaHasEmpresa.findFirst({
      where: { idEmpresa: companyId },
      include: { escala: true },
    });

    if (!vinculo) {
      return NextResponse.json(
        { message: 'Empresa sem escala vinculada' },
        { status: 400 },
      );
    }

    const escalaId = vinculo.idEscala;
    const escalaNome = vinculo.escala?.nome ?? `Escala #${escalaId}`;

    // 3) Funcionários (um só ou todos da empresa)
    const employees = await prisma.empresaFuncionario.findMany({
      where: {
        id_empresa: companyId,
        deleted: null,
        ...(employeeId ? { id_funcionario: employeeId } : {}),
      },
      select: {
        id_funcionario: true,
        nome: true,
        email: true,
      },
    });

    if (!employees || employees.length === 0) {
      return NextResponse.json(
        { message: 'Nenhum funcionário encontrado para esta empresa.' },
        { status: 400 },
      );
    }

    const baseUrl = buildBaseUrl();

    // 4) Monta destinatários COM o link (sem id do funcionário na URL)
    const recipients = employees
      .filter((emp) => isValidEmail(emp.email))
      .map((emp) => ({
        email: emp.email as string,
        nome: emp.nome,
        empresa: empresa.razaoSocial,
        link: buildEscalaLink({
          baseUrl,
          escalaId,
          empresaId: companyId,
        }),
      }));

    const total = employees.length;
    const skippedNoEmail = total - recipients.length;

    if (!recipients.length) {
      return NextResponse.json(
        {
          message:
            'Nenhum funcionário com e-mail válido encontrado para envio.',
          total,
          sent: 0,
          skippedNoEmail,
        },
        { status: 400 },
      );
    }

    const subject =
      typeof body?.subject === 'string' && body.subject.trim()
        ? body.subject.trim()
        : `Pesquisa - ${empresa.razaoSocial ?? 'Empresa'}`;

    // 5) Envia os e-mails de fato
    await sendEscalaEmails({
      subject,
      message:
        message ||
        'Por favor, responda à pesquisa no link abaixo.',
      recipients,
    });

    const sent = recipients.length;

    return NextResponse.json(
      {
        message: 'Envio concluído.',
        escalaId,
        escalaNome,
        total,
        sent,
        skippedNoEmail,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('POST /api/companies/[id]/send-escala error', error);
    const msg =
      error?.message?.includes('SMTP') ||
      error?.message?.includes('Configuração SMTP')
        ? 'Erro na configuração de e-mail (SMTP). Verifique as variáveis de ambiente.'
        : 'Erro interno ao enviar escala.';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
