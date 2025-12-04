'use client';
import React from 'react';
import { ModuloFormState } from './types';

export default function ModuleList({
  modulos,
  onEdit,
  onRemove,
}: {
  modulos: ModuloFormState[];
  onEdit: (tempId: string) => void;
  onRemove: (tempId: string) => void;
}) {
  return (
    <div>
      {modulos.length === 0 ? (
        <p className="empty-text">Nenhum módulo cadastrado. Clique em "Adicionar módulo" para começar.</p>
      ) : (
        <div className="modulos-list">
          {modulos.map((m) => (
            <div className="modulo-item" key={m.tempId}>
              <div className="modulo-main">
                <div className="modulo-title-row">
                  <div className="modulo-name">{m.nome || '—'}</div>
                </div>

                <div className="modulo-ranges" aria-hidden>
                  <span className="range-pill">
                    <span className="dot dot-risco" />
                    Risco: <strong>{m.valorInicialRisco || '—'} — {m.valorFinalRisco || '—'}</strong>
                  </span>

                  <span className="range-pill">
                    <span className="dot dot-intermediario" />
                    Interm.: <strong>{m.valorInicialIntermediario || '—'} — {m.valorFinalIntermediario || '—'}</strong>
                  </span>

                  <span className="range-pill">
                    <span className="dot dot-favoravel" />
                    Favorável: <strong>{m.valorInicialFavoravel || '—'} — {m.valorFinalFavoravel || '—'}</strong>
                  </span>
                </div>
              </div>

              <div className="modulo-actions">
                <button
                  type="button"
                  className="icon-btn edit"
                  onClick={() => onEdit(m.tempId)}
                  aria-label={`Editar módulo ${m.nome ?? ''}`}
                  title="Editar"
                >
                  {/* pencil icon */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <button
                  type="button"
                  className="icon-btn remove"
                  onClick={() => onRemove(m.tempId)}
                  aria-label={`Remover módulo ${m.nome ?? ''}`}
                  title="Remover"
                >
                  {/* trash icon */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                    <path d="M3 6h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M14 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .empty-text {
          color: #6b7280;
          padding: 12px 0;
        }

        .modulos-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 8px;
        }

        .modulo-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 10px;
          background: #fff;
          border: 1px solid rgba(14, 80, 80, 0.04);
          box-shadow: 0 6px 14px rgba(11,37,39,0.04);
        }

        .modulo-main {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .modulo-title-row {
          display:flex;
          align-items:center;
          gap:12px;
        }

        .modulo-name {
          font-weight: 700;
          color: #0B2527;
          font-size: 15px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .modulo-ranges {
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          align-items:center;
        }

        .range-pill {
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:6px 10px;
          border-radius:999px;
          background:#f7f9fb;
          border:1px solid #eef4f7;
          font-size:13px;
          color:#374151;
        }

        .range-pill strong { color: #0B2527; font-weight:700; margin-left:4px; }

        .dot {
          width:10px;
          height:10px;
          border-radius:999px;
          display:inline-block;
          box-shadow: 0 0 0 4px rgba(0,0,0,0.01) inset;
        }
        .dot-risco { background: #dc2626; }
        .dot-intermediario { background: #facc15; }
        .dot-favoravel { background: #16a34a; }

        .modulo-actions {
          display:flex;
          gap:8px;
          align-items:center;
          flex-shrink: 0;
        }

        .icon-btn {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          width:40px;
          height:40px;
          border-radius:999px;
          background: #ffffff;
          border: 1px solid transparent;
          cursor:pointer;
          transition: all .12s ease;
          color: #0B2527;
        }

        .icon-btn svg { display:block; }

        .icon-btn:focus { outline: 3px solid rgba(11,37,39,0.12); outline-offset: 2px; }

        .icon-btn.edit {
          border-color: rgba(11,37,39,0.08);
        }

        .icon-btn.remove {
          color: #dc2626;
          border-color: rgba(220,38,38,0.08);
        }

        @media (max-width: 720px) {
          .range-pill { font-size: 12px; padding:6px 8px; }
          .icon-btn { width:36px; height:36px; }
        }
      `}</style>
    </div>
  );
}
