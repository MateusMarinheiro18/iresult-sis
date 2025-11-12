// src/components/admin/CompanyEditForm.tsx
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CompanyEditForm({ initialCompany }: { initialCompany: any }) {
  const [razaoSocial, setRazaoSocial] = useState(initialCompany.razaoSocial ?? initialCompany.razao_social ?? '');
  const [email, setEmail] = useState(initialCompany.email ?? '');
  const [cnpj, setCnpj] = useState(initialCompany.cnpj ?? initialCompany.CNPJ ?? '');
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = initialCompany.id_empresa ?? initialCompany.id;
    const res = await fetch(`/api/companies/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ razaoSocial, email, cnpj }),
    });
    if (res.ok) {
      router.refresh();
      alert('Atualizado');
    } else {
      const j = await res.json();
      alert(j?.message || 'Erro ao atualizar');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm">Razão social</label>
        <input value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} required className="input" />
      </div>
      <div>
        <label className="block text-sm">Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} className="input" />
      </div>
      <div>
        <label className="block text-sm">CNPJ</label>
        <input value={cnpj} onChange={e => setCnpj(e.target.value)} className="input" />
      </div>
      <div>
        <button type="submit" className="btn">Salvar</button>
      </div>
    </form>
  );
}
