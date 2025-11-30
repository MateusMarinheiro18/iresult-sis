// src/app/web/escala/page.tsx
import React from 'react';
import SurveyPageClient from './SurveyPageClient';
import { prisma } from '@/lib/prisma';

type SearchParamsType = {
  escala?: string;
  empresa?: string;
};

type Props = {
  searchParams: Promise<SearchParamsType> | SearchParamsType;
};

export default async function SurveyPage(props: Props) {
  const searchParams = await props.searchParams;

  const escalaId = searchParams?.escala ? Number(searchParams.escala) : undefined;
  const empresaId = searchParams?.empresa ? Number(searchParams.empresa) : undefined;

  if (
    !escalaId ||
    !empresaId ||
    Number.isNaN(escalaId) ||
    Number.isNaN(empresaId) ||
    escalaId <= 0 ||
    empresaId <= 0
  ) {
    return (
      <SurveyPageClient
        error="Link inválido. Por favor, verifique o endereço recebido."
      />
    );
  }

  try {
    const [escala, empresa, vinculo] = await Promise.all([
      prisma.escala.findUnique({
        where: { id: escalaId },
        include: {
          perguntas: {
            where: { ativo: 1 },
            orderBy: { id: 'asc' },
            include: {
              respostasPossiveis: {
                where: { ativo: 1 },
                orderBy: { id: 'asc' },
              },
            },
          },
        },
      }),
      prisma.empresa.findUnique({
        where: { id: empresaId },
      }),
      prisma.escalaHasEmpresa.findFirst({
        where: { idEscala: escalaId, idEmpresa: empresaId },
      }),
    ]);

    if (!escala || escala.ativo !== 1) {
      return (
        <SurveyPageClient error="Esta enquete não está disponível no momento." />
      );
    }

    if (!empresa || empresa.ativo !== 1 || !vinculo) {
      return (
        <SurveyPageClient error="Esta enquete não está disponível para sua empresa." />
      );
    }

    const questions =
      escala.perguntas?.map((p) => ({
        id: p.id,
        text: p.pergunta,
        options:
          p.respostasPossiveis?.map((r) => ({
            id: r.id,
            label: r.resposta,
          })) ?? [],
      })) ?? [];

    // opcional: remove perguntas sem alternativas
    const filteredQuestions = questions.filter((q) => q.options.length > 0);

    return (
      <SurveyPageClient
        escalaId={escalaId}
        empresaId={empresaId}
        escalaNome={escala.nome}
        initialQuestions={filteredQuestions}
      />
    );
  } catch (err) {
    console.error('Erro ao carregar enquete', err);
    return (
      <SurveyPageClient error="Ocorreu um erro ao carregar a enquete. Tente novamente mais tarde." />
    );
  }
}
