'use client';

import React, { useEffect, useState } from 'react';
import HeaderClient from '@/components/client/dashboard/HeaderClient';
import ScalesGridClient from '@/components/client/dashboard/ScalesGridClient';
import ModulesPanelClient from '@/components/client/dashboard/ModulesPanel';
import SidebarPanelClient from '@/components/client/dashboard/SidebarPanelClient';

export type Agendamento = {
  id: number;
  tipo: string;
  nome: string;
  data: string | null;
  horario: string | null;
  dataRaw?: string | null;
};

type Empresa = { id: number; razaoSocial: string };
type Escala = { id: number; nome: string; totalRespostas: number; totalDestinatarios: number; progressoPercentual: number };
type Modulo = { id: number; nome: string; media: number; classificacao: 'FAVORAVEL' | 'INTERMEDIARIO' | 'RISCO' };
type Categoria = { id: number; nome: string; media: number; classificacao: 'FAVORAVEL' | 'INTERMEDIARIO' | 'RISCO' };
type Trilha = { id: number; nome: string; progresso: number };

type DashboardData = { empresas: Empresa[]; escalas: Escala[]; modulos: Modulo[]; trilhas: Trilha[]; agendamentos: Agendamento[] };

export default function DashboardClientPageClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<number | null>(null);
  const [moduloSelecionado, setModuloSelecionado] = useState<number | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tenta obter empresaId da sessão (ajuste conforme sua API de sessão).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/rh/me'); // adapte caso sua rota seja diferente (ex: /api/me)
        if (!res.ok) return;
        const json = await res.json();
        if (json?.empresaId) setEmpresaId(Number(json.empresaId));
      } catch (err) {
        console.warn('Erro buscando sessão (pode ser ok):', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (empresaId !== null) fetchDashboard();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);

  async function fetchDashboard() {
    setLoading(true);
    setError(null);
    try {
      // exige empresaId (as APIs client novas também exigem)
      const url = `/api/client/dashboard?empresaId=${empresaId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Erro ao carregar dashboard client', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategorias(moduloId: number) {
    setLoadingCategorias(true);
    try {
      const params = new URLSearchParams({ moduloId: String(moduloId), empresaId: String(empresaId ?? '') });
      const res = await fetch(`/api/client/dashboard/categorias?${params}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setCategorias(json);
      setModuloSelecionado(moduloId);
    } catch (err) {
      console.error('Erro categorias client', err);
      alert(`Erro ao carregar categorias: ${err instanceof Error ? err.message : 'erro'}`);
    } finally {
      setLoadingCategorias(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F3F4FF' }}>
        <div style={{ fontSize: 18, color: '#666' }}>Carregando dashboard...</div>
      </div>
    );
  }

  if (!empresaId) {
    return (
      <div style={{ padding: 24 }}>
        <HeaderClient />
        <div style={{ maxWidth: 900, margin: '24px auto', background: '#F3F4FF', padding: 20, borderRadius: 12, border: '1px solid #eee' }}>
          <h2 style={{ marginTop: 0 }}>Dashboard</h2>
          <p style={{ color: '#666' }}>Não foi possível identificar sua empresa. Verifique se está logado ou se sua conta está vinculada a uma empresa.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <HeaderClient />
        <div style={{ maxWidth: 900, margin: '24px auto', background: '#F3F4FF', padding: 20, borderRadius: 12, border: '1px solid #fee' }}>
          <h2 style={{ marginTop: 0 }}>Erro</h2>
          <p style={{ color: '#a00' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <HeaderClient />

        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#333', marginBottom: 16 }}>Escalas Ativas</h2>
          <ScalesGridClient escalas={data.escalas} />
        </div>

        <div className="dashboard-main-grid">
          <ModulesPanelClient
            modulos={data.modulos}
            moduloSelecionado={moduloSelecionado}
            categorias={categorias}
            loadingCategorias={loadingCategorias}
            onSelectModulo={fetchCategorias}
            onClearModulo={() => { setModuloSelecionado(null); setCategorias([]); }}
          />

          <SidebarPanelClient trilhas={data.trilhas} agendamentos={data.agendamentos} />
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
