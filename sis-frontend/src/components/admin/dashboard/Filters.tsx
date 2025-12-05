// File: src/components/admin/dashboard/Filters.tsx
import React from 'react';
import type { Empresa, Escala } from '@/app/admin/dashboard/DashboardAdminPageClient';

export default function Filters({ empresas, escalas, empresaSelecionada, setEmpresaSelecionada, escalaSelecionada, setEscalaSelecionada }: {
  empresas: Empresa[];
  escalas: Escala[];
  empresaSelecionada: number | null;
  setEmpresaSelecionada: (id: number | null) => void;
  escalaSelecionada: number | null;
  setEscalaSelecionada: (id: number | null) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
      <select value={empresaSelecionada ?? ''} onChange={(e) => setEmpresaSelecionada(e.target.value ? Number(e.target.value) : null)} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: 'white', fontSize: 14, cursor: 'pointer', minWidth: 200 }}>
        <option value="">Todas as empresas</option>
        {empresas.map(e => <option key={e.id} value={e.id}>{e.razaoSocial}</option>)}
      </select>

      <select value={escalaSelecionada ?? ''} onChange={(e) => setEscalaSelecionada(e.target.value ? Number(e.target.value) : null)} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: 'white', fontSize: 14, cursor: 'pointer', minWidth: 200 }}>
        <option value="">Todas as escalas</option>
        {escalas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
      </select>

      {(empresaSelecionada || escalaSelecionada) && (
        <button onClick={() => { setEmpresaSelecionada(null); setEscalaSelecionada(null); }} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #e0e0e0', background: 'white', fontSize: 14, cursor: 'pointer', color: '#666' }}>Limpar filtros</button>
      )}
    </div>
  );
}
