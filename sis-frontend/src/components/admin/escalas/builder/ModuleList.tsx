// src/components/admin/escalas/builder/ModuleList.tsx
'use client';
import React from 'react';
import { ModuloFormState } from './types';

export default function ModuleList({
  modulos,
  onEdit,
  onRemove,
  lockedModuleTempIds = [],
}: {
  modulos: ModuloFormState[];
  onEdit: (tempId: string) => void;
  onRemove: (tempId: string) => void;
  lockedModuleTempIds?: string[]; // optional: lista de tempIds que não podem ser removidos
}) {
  return (
    <div>
      {modulos.length === 0 ? (
        <p className="empty-text">Nenhum módulo cadastrado. Clique em "Adicionar módulo" para começar.</p>
      ) : (
        <div className="modulos-list" role="list" aria-label="Lista de módulos">
          {modulos.map((m) => {
            const isLocked = lockedModuleTempIds.includes(m.tempId);
            return (
              <div className="modulo-item" key={m.tempId} role="listitem" aria-roledescription="módulo">
                <div className="modulo-main">
                  <div className="modulo-title-row">
                    <div className="modulo-name" title={m.nome || '—'}>{m.nome || '—'}</div>
                    {isLocked && (
                      <span className="locked-badge" title="Módulo bloqueado: possui perguntas vinculadas" aria-hidden>
                        🔒
                      </span>
                    )}
                  </div>

                  <div className="modulo-ranges" aria-hidden>
                    <span className="range-pill" title={`Risco: ${m.valorInicialRisco || '—'} — ${m.valorFinalRisco || '—'}`}>
                      <span className="dot dot-risco" aria-hidden />
                      <span className="range-label">Risco:</span>
                      <strong>{m.valorInicialRisco || '—'} — {m.valorFinalRisco || '—'}</strong>
                    </span>

                    <span className="range-pill" title={`Intermediário: ${m.valorInicialIntermediario || '—'} — ${m.valorFinalIntermediario || '—'}`}>
                      <span className="dot dot-intermediario" aria-hidden />
                      <span className="range-label">Interm.:</span>
                      <strong>{m.valorInicialIntermediario || '—'} — {m.valorFinalIntermediario || '—'}</strong>
                    </span>

                    <span className="range-pill" title={`Favorável: ${m.valorInicialFavoravel || '—'} — ${m.valorFinalFavoravel || '—'}`}>
                      <span className="dot dot-favoravel" aria-hidden />
                      <span className="range-label">Favorável:</span>
                      <strong>{m.valorInicialFavoravel || '—'} — {m.valorFinalFavoravel || '—'}</strong>
                    </span>
                  </div>
                </div>

                <div className="modulo-actions" role="group" aria-label={`Ações do módulo ${m.nome ?? ''}`}>
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
                    onClick={() => { if (!isLocked) onRemove(m.tempId); }}
                    aria-label={isLocked ? `Remoção bloqueada para ${m.nome ?? ''}` : `Remover módulo ${m.nome ?? ''}`}
                    title={isLocked ? 'Remoção bloqueada' : 'Remover'}
                    disabled={isLocked}
                  >
                    {isLocked ? (
                      // lock icon
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                        <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M7 11V8a5 5 0 0 1 10 0v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      // trash icon
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                        <path d="M3 6h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        <path d="M14 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                        <path d="M9 6V4h6v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
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
          color: #421E97;
          font-size: 15px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .locked-badge {
          font-size: 13px;
          color: #6b7280;
          margin-left: 6px;
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

        .range-pill strong { color: #421E97; font-weight:700; margin-left:4px; }
        .range-label { color: #6b7280; font-weight:600; margin-left:2px; }

        .dot {
          width:10px;
          height:10px;
          border-radius:999px;
          display:inline-block;
          box-shadow: 0 0 0 4px rgba(0,0,0,0.01) inset;
          flex-shrink: 0;
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
          color: #421E97;
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

        .icon-btn[disabled] {
          opacity: 0.5;
          cursor: not-allowed;
          border-color: rgba(11,37,39,0.03);
          color: #6b7280;
        }

        @media (max-width: 720px) {
          .range-pill { font-size: 12px; padding:6px 8px; }
          .icon-btn { width:36px; height:36px; }
        }
      `}</style>
    </div>
  );
}
