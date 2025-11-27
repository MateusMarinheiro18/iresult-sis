// src/app/admin/relatorios/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminReportsPageClient from './AdminReportsPageClient';

export default async function AdminReportsPage() {
  const empresas = await prisma.empresa.findMany({
    where: {
      deleted: null, // apenas empresas ativas
    },
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

  return (
    <AdminReportsPageClient
      initialCompanies={empresas}
    />
  );
}
