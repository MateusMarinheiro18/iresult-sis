// src/app/admin/relatorios/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminReportsPageClient from './AdminReportsPageClient';

type Props = {
  // searchParams pode ser um objeto ou uma Promise (dependendo do ambiente Next)
  searchParams?: { [key: string]: string | string[] | undefined } | Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminReportsPage(props: Props) {
  // Resolve searchParams caso seja Promise (compatibilidade com diferentes runtimes)
  const searchParams =
    props.searchParams && typeof (props.searchParams as any).then === 'function'
      ? await (props.searchParams as Promise<{ [k: string]: any }>)
      : (props.searchParams as { [k: string]: any } | undefined);

  // tenta extrair company da query string (?company=ID)
  const companyParam = Array.isArray(searchParams?.company)
    ? searchParams?.company[0]
    : searchParams?.company;

  const companyId = companyParam ? Number(companyParam) : null;

  const whereBase: any = { deleted: null };

  // se companyId válido, filtra pela empresa específica
  if (companyId && !Number.isNaN(companyId) && companyId > 0) {
    whereBase.id = companyId;
  }

  const empresas = await prisma.empresa.findMany({
    where: whereBase,
    orderBy: {
      razaoSocial: 'asc',
    },
    select: {
      id: true,
      razaoSocial: true,
      cnpj: true,
      email: true,
      telefone: true,
    },
  });

  return <AdminReportsPageClient initialCompanies={empresas} />;
}
