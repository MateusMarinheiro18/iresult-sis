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
 * Gera o link público da escala incluindo o ID do funcionário:
 *   /web/escala?escala=<idEscala>&empresa=<idEmpresa>&func=<idFuncionario>
 */
function buildEscalaLink(params: {
  baseUrl: string;
  escalaId: number;
  empresaId: number;
  funcionarioId: number;
}) {
  const { baseUrl, escalaId, empresaId, funcionarioId } = params;

  try {
    const url = new URL('/web/escala', baseUrl);
    url.searchParams.set('escala', String(escalaId));
    url.searchParams.set('empresa', String(empresaId));
    url.searchParams.set('func', String(funcionarioId));
    return url.toString();
  } catch {
    return `${baseUrl.replace(
      /\/$/,
      '',
    )}/web/escala?escala=${escalaId}&empresa=${empresaId}&func=${funcionarioId}`;
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

    const empresa = await prisma.empresa.findUnique({
      where: { id: companyId },
    });

    if (!empresa) {
      return NextResponse.json(
        { message: 'Empresa não encontrada.' },
        { status: 404 },
      );
    }

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
          funcionarioId: emp.id_funcionario,
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

    await sendEscalaEmails({
      subject,
      message:
        message ||
        'Por favor, responda à pesquisa no link abaixo.',
      recipients,
    });

    const sent = recipients.length;

    // Atualizar EscalaHasEmpresa com data de envio e total de destinatários
    await prisma.escalaHasEmpresa.update({
      where: {
        idEscala_idEmpresa: {
          idEscala: escalaId,
          idEmpresa: companyId,
        },
      },
      data: {
        dataEnvio: new Date(),
        totalDestinatarios: sent,
      },
    });

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
