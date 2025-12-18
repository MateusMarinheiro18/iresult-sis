// src/app/admin/empresas/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import CompaniesTableClient from '@/components/admin/company/table/CompanyTableClient';
import Link from 'next/link';

export const revalidate = 0;

type Props = {
  // searchParams pode ser um objeto ou uma Promise (variantes do Next)
  searchParams?: { [key: string]: string | string[] | undefined } | Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function EmpresasPage(props: Props) {
  // Resolve searchParams caso seja Promise (compatível com qualquer versão/ambiente)
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

  const companies = await prisma.empresa.findMany({
    where: whereBase,
    orderBy: { created: 'desc' },
    select: {
      id: true,
      razaoSocial: true,
      cnpj: true,
      telefone: true,
      created: true,
    },
  });

  return (
    <div style={{ background: '#f3f4ff', minHeight: '100vh', padding: 28, boxSizing: 'border-box' }}>
      <main style={{ maxWidth: 1180, margin: '0 auto' }}>
        <CompaniesTableClient initialData={companies} />
      </main>
    </div>
  );
}
