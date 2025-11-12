// src/app/admin/empresas/[id]/page.tsx
import React from 'react';
import CompanyEditForm from '@/components/admin/CompanyEditForm';

type Props = { params: { id: string } };

async function getCompany(id: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/companies/${id}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function EmpresaDetail({ params }: Props) {
  const company = await getCompany(params.id);
  if (!company) return <div className="p-6">Empresa não encontrada</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl mb-4">Editar: {company.razaoSocial ?? company.razao_social}</h1>
      {/* client form to update */}
      {/* CompanyEditForm is a client component we'll add next */}
      <CompanyEditForm initialCompany={company} />
    </div>
  );
}
