// server component
import React from 'react';
import { notFound } from 'next/navigation';
import EditEmployeePageClient from './EditEmployeePageClient';
import { prisma } from '@/lib/prisma';

type Props = {
  params: Promise<{ id: string; employeeId: string }> | { id: string; employeeId: string };
};

export default async function Page(props: Props) {
  // Resolve params (Next.js may pass a Promise)
  const resolvedParams = await props.params;
  const idStr = resolvedParams?.id;
  const empStr = resolvedParams?.employeeId;

  const companyId = idStr ? Number(idStr) : NaN;
  const employeeId = empStr ? Number(empStr) : NaN;

  if (Number.isNaN(companyId) || companyId <= 0 || Number.isNaN(employeeId) || employeeId <= 0) {
    return <EditEmployeePageClient error="Parâmetros inválidos (companyId ou employeeId ausentes)." />;
  }

  // Busca empresa só para obter o nome (opcional)
  let companyName: string | null = null;
  try {
    const company = await prisma.empresa.findUnique({ where: { id: companyId }, select: { razaoSocial: true } });
    companyName = company?.razaoSocial ?? null;
  } catch (err) {
    console.error('Erro ao buscar empresa', err);
  }

  // Busca funcionário
  let employee: any = null;
  try {
    employee = await prisma.empresaFuncionario.findUnique({ where: { id_funcionario: employeeId } });
  } catch (err) {
    console.error('Erro ao buscar funcionário', err);
  }

  // Valida existência e pertencimento
  if (!employee || employee.id_empresa !== companyId) {
    return <EditEmployeePageClient companyId={companyId} companyName={companyName} error="Funcionário não encontrado para essa empresa." />;
  }

  // Passa o objeto employee como `initial` — EmployeeForm espera campos como nome,email,telefone,...
  // Ajuste se seu model tiver nomes diferentes (ex: id_funcionario -> id)
  return (
    <EditEmployeePageClient
      companyId={companyId}
      companyName={companyName}
      initial={employee}
    />
  );
}
