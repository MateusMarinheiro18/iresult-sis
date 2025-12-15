'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PdfReportViewCardClient({
  reportId,
  titulo,
  onBack,
}: {
  reportId: number;
  titulo: string;
  onBack: () => void;
}) {
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Carrega URL presignada pela rota client
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/client/reports/${reportId}/file`);
        const body = await res.json().catch(() => ({} as any));
        if (!res.ok || !body?.url) {
          throw new Error(body?.message || 'Erro ao carregar arquivo.');
        }
        if (!cancelled) setUrl(body.url);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Erro ao carregar arquivo.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  return (
    <div className="page-root">
      <main className="container">
        {/* BOTÃO DE VOLTAR PADRONIZADO */}
        <div className="top-row">
          <button className="back-btn" onClick={onBack}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Voltar</span>
          </button>
        </div>

        {/* CARTÃO DO PDF */}
        <section className="doc-card">
          <header className="doc-header">
            <h1 className="doc-title">{titulo}</h1>
          </header>

          <div className="doc-sub">
            <div className="left">{/* opcional: empresa (não disponível aqui) */}</div>
          </div>

          <div className="doc-body">
            {loading && <p className="status">Carregando PDF…</p>}
            {error && !loading && <p className="status error">{error}</p>}
            {url && !loading && !error && (
              <div className="preview-frame">
                <object data={url} type="application/pdf" width="100%" height="100%">
                  <p>
                    Não foi possível exibir o PDF. Você pode abrir em outra aba:{' '}
                    <a href={url} target="_blank" rel="noreferrer">
                      abrir PDF
                    </a>
                  </p>
                </object>
              </div>
            )}
          </div>
        </section>
      </main>

      <style jsx>{`
        .page-root {
          padding: 28px;
          background: #f3f4ff;
          min-height: 100vh;
          box-sizing: border-box;
        }
        .container {
          max-width: 980px;
          margin: 0 auto;
        }

        .top-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 12px;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #0b2527;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 14px;
          cursor: pointer;
          background: transparent;
        }
        .back-btn svg {
          stroke: #0b2527;
        }

        .doc-card {
          background: #fff;
          border-radius: 14px;
          padding: 28px;
          box-shadow: 0 14px 40px rgba(2, 6, 23, 0.08);
        }

        .doc-header {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          margin-bottom: 8px;
        }

        .doc-title {
          text-align: center;
          font-size: 28px;
          font-weight: 800;
          color: #062123;
          margin: 0;
        }

        .doc-sub {
          display: flex;
          justify-content: space-between;
          margin: 14px 0 20px;
          color: #6b7280;
          font-size: 13px;
        }

        .doc-body {
          color: #374151;
          font-size: 15px;
        }

        .status {
          font-size: 14px;
          color: #4b5563;
        }
        .status.error {
          color: #b91c1c;
        }

        .preview-frame {
          margin-top: 8px;
          border-radius: 12px;
          border: 1px solid #d1d5db;
          overflow: hidden;
          height: 540px;
          background: #111827;
        }

        @media (max-width: 640px) {
          .doc-card {
            padding: 18px;
          }
          .doc-title {
            font-size: 20px;
          }
          .doc-sub {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
          .preview-frame {
            height: 420px;
          }
        }
      `}</style>
    </div>
  );
}
