// src/app/admin/empresas/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import CompaniesTableClient from '@/components/admin/company/CompanyTableClient';
import Link from 'next/link';

export const revalidate = 0;

export default async function EmpresasPage() {
  const companies = await prisma.empresa.findMany({
    where: { deleted: null },
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
        {/* pass companies to client component (client handles search/filter) */}
        <CompaniesTableClient initialData={companies} />
      </main>
    </div>
  );
}
