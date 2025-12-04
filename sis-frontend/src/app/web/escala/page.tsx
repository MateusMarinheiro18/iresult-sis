// src/app/web/escala/page.tsx
import React from 'react';
import SurveyPageClient from './SurveyPageClient';
import { prisma } from '@/lib/prisma';

type SearchParamsType = {
  escala?: string;
  empresa?: string;
  func?: string; // NOVO: ID do funcionário
};

type Props = {
  searchParams: Promise<SearchParamsType> | SearchParamsType;
};

export default async function SurveyPage(props: Props) {
  const searchParams = await props.searchParams;

  const escalaId = searchParams?.escala ? Number(searchParams.escala) : undefined;
  const empresaId = searchParams?.empresa ? Number(searchParams.empresa) : undefined;
  const funcionarioId = searchParams?.func ? Number(searchParams.func) : undefined;

  if (
    !escalaId ||
    !empresaId ||
    !funcionarioId ||
    Number.isNaN(escalaId) ||
    Number.isNaN(empresaId) ||
    Number.isNaN(funcionarioId) ||
    escalaId <= 0 ||
    empresaId <= 0 ||
    funcionarioId <= 0
  ) {
    return (
      <SurveyPageClient
        error="Link inválido. Por favor, verifique o endereço recebido."
      />
    );
  }

  try {
    const [escala, empresa, vinculo, funcionario] = await Promise.all([
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
      prisma.empresaFuncionario.findUnique({
        where: { id_funcionario: funcionarioId },
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

    if (!funcionario || funcionario.id_empresa !== empresaId) {
      return (
        <SurveyPageClient error="Funcionário não encontrado ou não pertence a esta empresa." />
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

    const filteredQuestions = questions.filter((q) => q.options.length > 0);

    return (
      <SurveyPageClient
        escalaId={escalaId}
        empresaId={empresaId}
        funcionarioId={funcionarioId}
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
