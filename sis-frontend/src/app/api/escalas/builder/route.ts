// src/app/api/escalas/builder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function checkAdmin(req: NextRequest) {
  // TODO: integrar com autenticação real
  return true;
}

type RespostaInput = {
  resposta?: string | null;
};

type PerguntaInput = {
  pergunta?: string | null;

  valorInicialFavoravel?: string | number | null;
  valorFinalFavoravel?: string | number | null;
  valorInicialIntermediario?: string | number | null;
  valorFinalIntermediario?: string | number | null;
  valorInicialRisco?: string | number | null;
  valorFinalRisco?: string | number | null;

  respostas?: RespostaInput[];
};

type EscalaBuilderInput = {
  nome?: string | null;
  dataVencimento?: string | null;
  ativo?: number | boolean | null;
  perguntas?: PerguntaInput[];
};

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    throw new Error('DATA_INVALIDA');
  }
  return d;
}

// Para campos Decimal do Prisma, podemos mandar string.
function parseDecimal(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // troca vírgula por ponto
    return trimmed.replace(',', '.');
  }

  return null;
}

export async function POST(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let body: EscalaBuilderInput;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido.' }, { status: 400 });
  }

  const nome = body.nome?.trim();
  if (!nome) {
    return NextResponse.json(
      { error: 'Campo "nome" é obrigatório.' },
      { status: 400 }
    );
  }

  const ativo =
    typeof body.ativo === 'boolean'
      ? body.ativo
        ? 1
        : 0
      : typeof body.ativo === 'number'
      ? body.ativo
      : 1;

  if (!Array.isArray(body.perguntas) || body.perguntas.length === 0) {
    return NextResponse.json(
      { error: 'Adicione pelo menos uma pergunta.' },
      { status: 400 }
    );
  }

  let dataVencimento: Date | null = null;
  try {
    dataVencimento = parseDate(body.dataVencimento ?? null);
  } catch (err: any) {
    if (err?.message === 'DATA_INVALIDA') {
      return NextResponse.json(
        { error: 'Campo "dataVencimento" deve ser uma data válida.' },
        { status: 400 }
      );
    }
    throw err;
  }

  // Valida estrutura básica das perguntas e respostas
  for (const [index, p] of body.perguntas.entries()) {
    const perguntaTexto = p.pergunta?.trim();
    if (!perguntaTexto) {
      return NextResponse.json(
        { error: `Pergunta ${index + 1}: texto é obrigatório.` },
        { status: 400 }
      );
    }

    if (!Array.isArray(p.respostas) || p.respostas.length === 0) {
      return NextResponse.json(
        { error: `Pergunta ${index + 1}: adicione pelo menos uma resposta.` },
        { status: 400 }
      );
    }

    for (const [rIndex, r] of p.respostas.entries()) {
      const respostaTexto = r.resposta?.trim();
      if (!respostaTexto) {
        return NextResponse.json(
          {
            error: `Pergunta ${index + 1}, resposta ${
              rIndex + 1
            }: texto é obrigatório.`,
          },
          { status: 400 }
        );
      }
    }
  }

  const now = new Date();

  try {
    const escala = await prisma.$transaction(async (tx) => {
      const createdEscala = await tx.escala.create({
        data: {
          nome,
          dataVencimento,
          ativo,
          created: now,
          createdBy: null,
        },
      });

      for (const p of body.perguntas!) {
        const perguntaTexto = p.pergunta!.trim();

        const pergunta = await tx.escalaPergunta.create({
          data: {
            pergunta: perguntaTexto,
            idEscala: createdEscala.id,

            valorInicialFavoravel: parseDecimal(p.valorInicialFavoravel),
            valorFinalFavoravel: parseDecimal(p.valorFinalFavoravel),
            valorInicialIntermediario: parseDecimal(
              p.valorInicialIntermediario
            ),
            valorFinalIntermediario: parseDecimal(p.valorFinalIntermediario),
            valorInicialRisco: parseDecimal(p.valorInicialRisco),
            valorFinalRisco: parseDecimal(p.valorFinalRisco),

            ativo: 1,
            created: now,
            createdBy: null,
          },
        });

        for (const r of p.respostas!) {
          const respostaTexto = r.resposta!.trim();

          await tx.escalaPerguntaResposta.create({
            data: {
              resposta: respostaTexto,
              idPergunta: pergunta.id,
              ativo: 1,
              created: now,
              createdBy: null,
            },
          });
        }
      }

      return createdEscala;
    });

    return NextResponse.json(
      {
        id: escala.id,
        nome: escala.nome,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/escalas/builder erro:', err);
    return NextResponse.json(
      { error: 'Erro ao criar escala completa.' },
      { status: 500 }
    );
  }
}
