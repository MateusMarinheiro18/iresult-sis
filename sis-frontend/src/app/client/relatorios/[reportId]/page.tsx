'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PdfReportViewCardClient from '@/components/client/reports/PdfReportViewCardClient';
import ReportViewCardClient from '@/components/client/reports/ReportViewCardClient';

type SafeReport = {
  id: number;
  titulo: string;
  texto?: string | null;
  dataPublicacao?: string | null;
  created?: string | null;
  updated?: string | null;
  fileKey?: string | null;
  idEmpresa?: number;
};

export default function ReportPageClient() {
  const params = useParams() as { reportId?: string };
  const router = useRouter();
  const reportIdStr = params?.reportId;
  const reportId = reportIdStr ? Number(reportIdStr) : NaN;

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<SafeReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // valida param
  useEffect(() => {
    if (!reportIdStr || Number.isNaN(reportId) || reportId <= 0) {
      setError('Parâmetros inválidos.');
      setLoading(false);
    }
  }, [reportIdStr, reportId]);

  // carrega relatório diretamente pela rota client (backend deduz empresa pelo sis_rh_sess)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (error) return;
      if (Number.isNaN(reportId) || reportId <= 0) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/client/reports/${reportId}`);
        const body = await res.json().catch(() => ({} as any));
        if (!res.ok) {
          const msg = body?.message || body?.error || `Erro ${res.status}`;
          throw new Error(String(msg));
        }

        if (!body || !body.id) {
          throw new Error('Relatório não encontrado.');
        }

        const safe: SafeReport = {
          id: body.id,
          titulo: body.titulo,
          texto: body.texto ?? null,
          dataPublicacao: body.dataPublicacao ?? null,
          created: body.created ?? null,
          updated: body.updated ?? null,
          fileKey: body.fileKey ?? null,
          idEmpresa: body.idEmpresa ?? undefined,
        };

        if (!cancelled) setReport(safe);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Erro ao carregar relatório.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reportId, error]);

  function handleBack() {
    router.push('/client/relatorios');
  }

  if (loading) {
    return (
      <div style={{ padding: 28, background: '#f3f4ff', minHeight: '100vh' }}>
        <div style={{ maxWidth: 980, margin: '32px auto', textAlign: 'center', color: '#666' }}>
          Carregando relatório...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 28, background: '#f3f4ff', minHeight: '100vh' }}>
        <div style={{ maxWidth: 980, margin: '32px auto' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              onClick={handleBack}
              style={{
                display: 'inline-flex',
                gap: 8,
                alignItems: 'center',
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                color: '#0b2527',
                fontWeight: 600,
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Voltar</span>
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 6px 18px rgba(11,37,39,0.06)' }}>
            <h2 style={{ marginTop: 0 }}>Erro</h2>
            <p style={{ color: '#a00' }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: 28, background: '#f3f4ff', minHeight: '100vh' }}>
        <div style={{ maxWidth: 980, margin: '32px auto', textAlign: 'center', color: '#666' }}>Relatório não encontrado.</div>
      </div>
    );
  }

  // se tiver fileKey — renderiza preview PDF (rota do file é /api/client/reports/:id/file)
  if (report.fileKey) {
    return (
      <PdfReportViewCardClient
        reportId={report.id}
        titulo={report.titulo}
        onBack={handleBack}
      />
    );
  }

  return (
    <ReportViewCardClient
      initialReport={report}
      onBack={handleBack}
    />
  );
}
