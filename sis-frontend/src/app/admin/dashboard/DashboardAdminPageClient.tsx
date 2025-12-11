// src/app/admin/dashboard/DashboardAdminPageClient.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/admin/dashboard/Header';
import Filters from '@/components/admin/dashboard/Filters';
import ScalesGrid from '@/components/admin/dashboard/ScalesGrid';
import ModulesPanel from '@/components/admin/dashboard/ModulesPanel';
import SidebarPanel from '@/components/admin/dashboard/SidebarPanel';

export type Empresa = { id: number; razaoSocial: string };
export type Escala = { id: number; nome: string; totalRespostas: number; totalDestinatarios: number; progressoPercentual: number };
export type Modulo = { id: number; nome: string; media: number; classificacao: 'FAVORAVEL' | 'INTERMEDIARIO' | 'RISCO' };
export type Categoria = { id: number; nome: string; media: number; classificacao: 'FAVORAVEL' | 'INTERMEDIARIO' | 'RISCO' };
export type Trilha = { id: number; nome: string; progresso: number };

/**
 * AGORA inclui dataRaw opcional.
 * - data: string legível (pode vir do backend)
 * - horario: string legível (pode vir do backend)
 * - dataRaw: ISO (preferir)
 */
export type Agendamento = {
  id: number;
  tipo: string;
  nome: string;
  data: string | null;
  horario: string | null;
  dataRaw?: string | null;
};

export type DashboardData = { empresas: Empresa[]; escalas: Escala[]; modulos: Modulo[]; trilhas: Trilha[]; agendamentos: Agendamento[] };

export default function DashboardAdminPageClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [empresaSelecionada, setEmpresaSelecionada] = useState<number | null>(null);
  const [escalaSelecionada, setEscalaSelecionada] = useState<number | null>(null);
  const [moduloSelecionado, setModuloSelecionado] = useState<number | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [empresaSelecionada, escalaSelecionada]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (empresaSelecionada) params.append('empresaId', empresaSelecionada.toString());
      if (escalaSelecionada) params.append('escalaId', escalaSelecionada.toString());
      const url = `/api/dashboard${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Erro ao carregar dashboard', err);
      alert(`Erro ao carregar dashboard: ${err instanceof Error ? err.message : 'erro'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async (moduloId: number) => {
    setLoadingCategorias(true);
    try {
      const params = new URLSearchParams();
      params.append('moduloId', String(moduloId));
      if (empresaSelecionada) params.append('empresaId', String(empresaSelecionada));
      const url = `/api/dashboard/categorias?${params}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setCategorias(json);
      setModuloSelecionado(moduloId);
    } catch (err) {
      console.error('Erro categorias', err);
      alert(`Erro ao carregar categorias: ${err instanceof Error ? err.message : 'erro'}`);
    } finally {
      setLoadingCategorias(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F5F5F7' }}>
        <div style={{ fontSize: 18, color: '#666' }}>Carregando dashboard...</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <Header />

        <Filters
          empresas={data.empresas}
          escalas={data.escalas}
          empresaSelecionada={empresaSelecionada}
          setEmpresaSelecionada={setEmpresaSelecionada}
          escalaSelecionada={escalaSelecionada}
          setEscalaSelecionada={setEscalaSelecionada}
        />

        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#333', marginBottom: 16 }}>Escalas Ativas</h2>
          <ScalesGrid escalas={data.escalas} escalaSelecionada={escalaSelecionada} setEscalaSelecionada={setEscalaSelecionada} />
        </div>

        <div className="dashboard-main-grid">
          <ModulesPanel
            modulos={data.modulos}
            moduloSelecionado={moduloSelecionado}
            categorias={categorias}
            loadingCategorias={loadingCategorias}
            onSelectModulo={(id) => fetchCategorias(id)}
            onClearModulo={() => { setModuloSelecionado(null); setCategorias([]); }}
          />

          <SidebarPanel trilhas={data.trilhas} agendamentos={data.agendamentos} />
        </div>
      </div>

      <style jsx>{`
        .dashboard-main-grid {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 24px;
        }

        @media (max-width: 1024px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          div[style*="padding: 32px 24px"] {
            padding: 16px 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
