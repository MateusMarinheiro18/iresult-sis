// src/app/admin/escalas/[id]/edit/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import EscalaEditPageClient from './EscalaEditPageClient';
import type {
  EscalaFormState,
  PerguntaFormState,
  RespostaFormState,
} from '@/components/admin/escalas/EscalaBuilderForm';

type Params = { id: string };
type Props = {
  params: Params | Promise<Params>;
};

// helpers para criar tempId estável
function makePergTempId(p: { id?: number | null }, index: number) {
  if (p.id) return `perg-${p.id}`;
  return `perg-new-${index}`;
}

function makeRespTempId(
  r: { id?: number | null },
  pergIndex: number,
  respIndex: number
) {
  if (r.id) return `resp-${r.id}`;
  return `resp-new-${pergIndex}-${respIndex}`;
}

export default async function EscalaEditPage(props: Props) {
  // Next 16 / Turbopack: params pode ser Promise
  const resolvedParams = await props.params;
  const idStr = resolvedParams?.id;
  const escalaId = idStr ? Number(idStr) : NaN;

  if (!escalaId || Number.isNaN(escalaId) || escalaId <= 0) {
    return (
      <div className="page-root">
        <main className="container">
          <h1>Escala não encontrada</h1>
          <p>ID inválido.</p>
        </main>
      </div>
    );
  }

  const escala = await prisma.escala.findUnique({
    where: { id: escalaId },
    include: {
      perguntas: {
        include: {
          // do schema: EscalaPergunta.respostasPossiveis
          respostasPossiveis: true,
        },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!escala) {
    return (
      <div className="page-root">
        <main className="container">
          <h1>Escala não encontrada</h1>
          <p>Nenhum registro com esse ID.</p>
        </main>
      </div>
    );
  }

  const perguntasForm: PerguntaFormState[] =
    escala.perguntas && escala.perguntas.length
      ? escala.perguntas.map((p, pIndex) => {
          const respostasDb = p.respostasPossiveis ?? [];

          const respostasForm: RespostaFormState[] =
            respostasDb.length > 0
              ? respostasDb.map((r, rIndex) => ({
                  tempId: makeRespTempId(r, pIndex, rIndex),
                  id: r.id,
                  resposta: r.resposta ?? '',
                }))
              : [
                  {
                    tempId: makeRespTempId({}, pIndex, 0),
                    resposta: '',
                  },
                ];

          const perguntaForm: PerguntaFormState = {
            tempId: makePergTempId(p, pIndex),
            id: p.id,
            pergunta: p.pergunta ?? '',
            valorInicialFavoravel: p.valorInicialFavoravel
              ? p.valorInicialFavoravel.toString()
              : '',
            valorFinalFavoravel: p.valorFinalFavoravel
              ? p.valorFinalFavoravel.toString()
              : '',
            valorInicialIntermediario: p.valorInicialIntermediario
              ? p.valorInicialIntermediario.toString()
              : '',
            valorFinalIntermediario: p.valorFinalIntermediario
              ? p.valorFinalIntermediario.toString()
              : '',
            valorInicialRisco: p.valorInicialRisco
              ? p.valorInicialRisco.toString()
              : '',
            valorFinalRisco: p.valorFinalRisco
              ? p.valorFinalRisco.toString()
              : '',
            respostas: respostasForm,
          };

          return perguntaForm;
        })
      : [
          {
            tempId: makePergTempId({}, 0),
            pergunta: '',
            valorInicialFavoravel: '',
            valorFinalFavoravel: '',
            valorInicialIntermediario: '',
            valorFinalIntermediario: '',
            valorInicialRisco: '',
            valorFinalRisco: '',
            respostas: [
              {
                tempId: makeRespTempId({}, 0, 0),
                resposta: '',
              },
            ],
          },
        ];

  const initialEscala: EscalaFormState = {
    id: escala.id,
    nome: escala.nome ?? '',
    dataVencimento: escala.dataVencimento
      ? escala.dataVencimento.toISOString().slice(0, 10) // yyyy-mm-dd
      : '',
    ativo:
      escala.ativo == null
        ? true
        : escala.ativo === 1,
    perguntas: perguntasForm,
  };

  return (
    <EscalaEditPageClient
      escalaId={escalaId}
      initialEscala={initialEscala}
    />
  );
}
