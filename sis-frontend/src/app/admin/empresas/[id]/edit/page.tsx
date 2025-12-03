// src/app/admin/empresas/[id]/edit/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import EditPageClient from './EditPageClient';

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

async function getCompanyById(id: number) {
  return prisma.empresa.findUnique({
    where: { id },
    include: {
      // novos relacionamentos que precisamos no form de edição
      gruposFuncionarios: {
        where: { ativo: 1 },
      },
      escalasEmpresas: true,      // EscalaHasEmpresa[]
    },
  });
}

export default async function Page({ params }: Props) {
  const resolvedParams = await params;
  const idStr = resolvedParams?.id;

  if (!idStr) {
    notFound();
  }

  const id = Number(idStr);
  if (Number.isNaN(id)) {
    notFound();
  }

  let company;
  try {
    company = await getCompanyById(id);
  } catch (err) {
    console.error('Erro ao buscar empresa via prisma', err);
    company = null;
  }

  if (!company) {
    notFound();
  }

  // escala vinculada (0 ou 1) vinda da relação EscalaHasEmpresa
  const escalaVinculo = company.escalasEmpresas?.[0] ?? null;
  const escalaId = escalaVinculo ? escalaVinculo.idEscala : null;

  // Serializar dados para o cliente
  const serializedCompany = {
    id: company.id,
    razaoSocial: company.razaoSocial ?? null,
    cnpj: company.cnpj ?? null,
    email: company.email ?? null,
    telefone: company.telefone ?? null,
    cep: company.cep ?? null,
    ativo: company.ativo ?? null,
    created: company.created ? company.created.toISOString() : null,
    updated: company.updated ? company.updated.toISOString() : null,
    escalaId,

    // importantíssimo: mandar os grupos pro client
    // CompanyEditForm usa `initial.gruposFuncionarios` -> .nome
    gruposFuncionarios: (company.gruposFuncionarios ?? []).map((g) => ({
      id: g.id,
      nome: g.nome,
    })),
  };

  return <EditPageClient company={serializedCompany} />;
}
