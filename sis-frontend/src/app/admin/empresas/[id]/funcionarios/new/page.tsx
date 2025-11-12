// src/app/admin/empresas/[id]/funcionarios/new/page.tsx
import React from 'react';
import EmployeeForm from '@/components/admin/employee/EmployeeForm';
import { prisma } from '@/lib/prisma';
import NewEmployeePageClient from './NewEmployeePageClient';

type Props = { 
  params: Promise<{ id: string }> | { id: string };
};

export default async function NewEmployeePage(props: Props) {
  // 1) Resolve params (Next.js 15 pode retornar Promise)
  const resolvedParams = await props.params;
  const idStr = resolvedParams?.id;
  const companyId = idStr ? Number(idStr) : NaN;

  // 2) Se companyId inválido -> renderizar erro
  if (Number.isNaN(companyId) || companyId <= 0) {
    return (
      <NewEmployeePageClient 
        error="Não foi possível identificar a empresa (companyId). A página precisa do parâmetro da rota."
      />
    );
  }

  // 3) Buscar nome da empresa
  let companyName: string | null = null;
  try {
    const company = await prisma.empresa.findUnique({
      where: { id: companyId },
      select: { razaoSocial: true }
    });
    companyName = company?.razaoSocial ?? null;
  } catch (err) {
    console.error('Erro buscando empresa:', err);
  }

  // 4) Render normal
  return (
    <NewEmployeePageClient 
      companyId={companyId}
      companyName={companyName}
    />
  );
}