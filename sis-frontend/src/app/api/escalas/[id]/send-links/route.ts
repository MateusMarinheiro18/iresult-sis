import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBulkEmail } from '@/lib/email/sendEscala';

type ParamsType = { id: string };

type Body = {
  message?: string;
};

export async function POST(
  req: Request,
  context: { params: ParamsType } | { params: Promise<ParamsType> },
) {
  const resolvedParams =
    'params' in context ? await context.params : (context as any).params;
  const idStr = resolvedParams?.id;
  const escalaId = idStr ? Number(idStr) : NaN;

  if (!escalaId || Number.isNaN(escalaId) || escalaId <= 0) {
    return NextResponse.json(
      { error: 'ID de escala inválido.' },
      { status: 400 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const { message } = body;

  try {
    const escala = await prisma.escala.findUnique({
      where: { id: escalaId },
    });

    if (!escala || escala.ativo !== 1) {
      return NextResponse.json(
        { error: 'Escala não encontrada ou inativa.' },
        { status: 400 },
      );
    }

    // empresas vinculadas à escala
    const vinculos = await prisma.escalaHasEmpresa.findMany({
      where: { idEscala: escalaId },
      include: {
        empresa: true,
      },
    });

    const empresasValidas = vinculos
      .filter((v) => v.empresa && v.empresa.ativo === 1)
      .map((v) => v.empresa!);

    if (!empresasValidas.length) {
      return NextResponse.json(
        {
          error:
            'Nenhuma empresa ativa vinculada a esta escala para envio dos links.',
        },
        { status: 400 },
      );
    }

    let totalDestinatarios = 0;
    let totalEmpresasComDestinatarios = 0;

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    for (const empresa of empresasValidas) {
      const funcionarios = await prisma.empresaFuncionario.findMany({
        where: {
          id_empresa: empresa.id,
          ativo: 1,
          email: { not: null },
        },
        select: {
          email: true,
        },
      });

      const emails = Array.from(
        new Set(
          funcionarios
            .map((f) => f.email)
            .filter((e): e is string => !!e && e.trim().length > 0),
        ),
      );

      if (!emails.length) {
        continue;
      }

      totalEmpresasComDestinatarios += 1;
      totalDestinatarios += emails.length;

      const link = `${baseUrl}/web/escala?escala=${escalaId}&empresa=${empresa.id}`;

      const subject = `Enquete: ${escala.nome}`;

      const msgTextoBase =
        message?.trim() ||
        'Olá! Gostaríamos de contar com a sua participação respondendo à enquete abaixo.';

      const text = `${msgTextoBase}

Acesse o formulário através do link abaixo:
${link}

Obrigado!`;

      const html = `
        <p>${msgTextoBase
          .split('\n')
          .map((line) => line.trim())
          .join('<br />')}</p>
        <p>
          Acesse o formulário através do link abaixo:<br />
          <a href="${link}" target="_blank" rel="noopener noreferrer">${link}</a>
        </p>
        <p>Obrigado!</p>
      `;

      await sendBulkEmail({
        subject,
        text,
        html,
        to: emails,
      });
    }

    return NextResponse.json({
      ok: true,
      totalEmpresas: totalEmpresasComDestinatarios,
      totalDestinatarios,
    });
  } catch (err) {
    console.error('Erro ao enviar links de escala por e-mail', err);
    return NextResponse.json(
      { error: 'Erro interno ao enviar os e-mails.' },
      { status: 500 },
    );
  }
}
