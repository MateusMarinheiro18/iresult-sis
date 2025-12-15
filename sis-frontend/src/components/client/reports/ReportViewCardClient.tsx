'use client';

import React from 'react';

export default function ReportViewCardClient({
  initialReport,
  onBack,
}: {
  initialReport: {
    id: number;
    titulo: string;
    texto?: string | null;
    dataPublicacao?: string | null;
    created?: string | null;
    updated?: string | null;
  };
  onBack: () => void;
}) {
  const report = initialReport;

  const formatDate = (d?: string | null) => {
    if (!d) return '';
    try {
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(d));
    } catch {
      return String(d);
    }
  };

  function paragraphsFromText(text: string) {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (!normalized) return [];
    return normalized.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  }

  const blocks = paragraphsFromText(report.texto ?? '');

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

        {/* CARTÃO DO DOCUMENTO */}
        <section className="doc-card">
          <header className="doc-header">
            <h1 className="doc-title">{report.titulo}</h1>
          </header>

          <div className="doc-sub">
            <div className="left">
              {report.dataPublicacao
                ? `Publicado em ${formatDate(report.dataPublicacao)}`
                : report.created
                ? `Criado em ${formatDate(report.created)}`
                : ''}
            </div>
            <div className="right">{/* opcional: empresa */}</div>
          </div>

          <div className="doc-body">
            {blocks.length === 0 ? (
              <p className="empty">Sem conteúdo.</p>
            ) : (
              blocks.map((b, i) => (
                <p key={i} className="p">
                  {b.split('\n').map((line, idx, arr) => (
                    <React.Fragment key={idx}>
                      {line}
                      {idx < arr.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </p>
              ))
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

        /* PADRÃO DO BOTÃO DE VOLTAR */
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
        .back-btn svg { stroke: #0b2527; }

        .doc-card {
          background: #fff;
          border-radius: 14px;
          padding: 28px;
          box-shadow: 0 14px 40px rgba(2,6,23,0.08);
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
          display:flex;
          justify-content:space-between;
          margin: 14px 0 20px;
          color:#6b7280;
          font-size:13px;
        }

        .doc-body {
          color:#374151;
          line-height:1.8;
          font-size:15px;
        }

        .p {
          margin: 0 0 16px;
          white-space: pre-wrap;
        }

        .empty {
          color:#9ca3af;
          font-style: italic;
        }

        @media (max-width: 640px) {
          .doc-card { padding: 18px; }
          .doc-title { font-size: 20px; }
          .doc-sub { flex-direction: column; align-items: flex-start; gap: 6px; }
        }
      `}</style>
    </div>
  );
}
