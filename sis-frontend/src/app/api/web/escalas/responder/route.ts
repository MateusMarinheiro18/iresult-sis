// src/app/api/web/escalas/responder/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RespostaPayload = {
  perguntaId: number;
  respostaId: number;
};

type Body = {
  escalaId?: number;
  empresaId?: number;
  respostas?: RespostaPayload[];
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  }

  const { escalaId, empresaId, respostas } = body;

  if (
    !escalaId ||
    !empresaId ||
    Number.isNaN(Number(escalaId)) ||
    Number.isNaN(Number(empresaId)) ||
    !Array.isArray(respostas) ||
    respostas.length === 0
  ) {
    return NextResponse.json(
      { error: 'Dados inválidos para registro de respostas.' },
      { status: 400 }
    );
  }

  const escalaIdNum = Number(escalaId);
  const empresaIdNum = Number(empresaId);

  try {
    const [escala, empresa, vinculo] = await Promise.all([
      prisma.escala.findUnique({ where: { id: escalaIdNum } }),
      prisma.empresa.findUnique({ where: { id: empresaIdNum } }),
      prisma.escalaHasEmpresa.findFirst({
        where: { idEscala: escalaIdNum, idEmpresa: empresaIdNum },
      }),
    ]);

    if (!escala || escala.ativo !== 1) {
      return NextResponse.json(
        { error: 'Escala não disponível.' },
        { status: 400 }
      );
    }

    if (!empresa || empresa.ativo !== 1 || !vinculo) {
      return NextResponse.json(
        { error: 'Esta enquete não está disponível para esta empresa.' },
        { status: 400 }
      );
    }

    const perguntaIds = Array.from(
      new Set(respostas.map((r) => Number(r.perguntaId)))
    );

    const perguntasValidas = await prisma.escalaPergunta.findMany({
      where: {
        idEscala: escalaIdNum,
        id: { in: perguntaIds },
        ativo: 1,
      },
      select: { id: true },
    });

    if (perguntasValidas.length !== perguntaIds.length) {
      return NextResponse.json(
        { error: 'Algumas perguntas não pertencem a esta escala.' },
        { status: 400 }
      );
    }

    const respostaIds = Array.from(
      new Set(respostas.map((r) => Number(r.respostaId)))
    );

    const respostasValidas = await prisma.escalaPerguntaResposta.findMany({
      where: {
        id: { in: respostaIds },
        ativo: 1,
      },
      select: { id: true },
    });

    if (respostasValidas.length !== respostaIds.length) {
      return NextResponse.json(
        { error: 'Algumas respostas não são válidas.' },
        { status: 400 }
      );
    }

    const now = new Date();

    await prisma.respostaFuncionario.createMany({
      data: respostas.map((r) => ({
        idEscala: escalaIdNum,
        idEmpresa: empresaIdNum,
        idPergunta: Number(r.perguntaId),
        idResposta: Number(r.respostaId),
        dataResposta: now,
        ativo: 1,
        created: now,
      })),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro ao salvar respostas da escala', err);
    return NextResponse.json(
      { error: 'Erro ao salvar suas respostas.' },
      { status: 500 }
    );
  }
}
