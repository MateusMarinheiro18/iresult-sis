'use client';
import React from 'react';

export type PerguntaRow = {
  tempId: string;
  pergunta: string;
  ordem: number;
  moduloTempId: string;
  categoriaTempId: string;
  respostas: { tempId: string; resposta: string; valor: number | string }[];
};

export default function QuestionList({
  perguntas,
  getModuloName,
  getCategoriaName,
  onEdit,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggingQuestionId,
}: {
  perguntas: PerguntaRow[];
  getModuloName: (modTempId: string) => string;
  getCategoriaName: (catTempId: string) => string;
  onEdit: (tempId: string) => void;
  onRemove: (tempId: string) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, tempId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>, tempId: string) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, targetId: string) => void;
  onDragEnd: () => void;
  draggingQuestionId: string | null;
}) {
  return (
    <div>
      {perguntas.length === 0 ? (
        <div className="empty-wrap">
          <p className="empty-text">
            Nenhuma pergunta cadastrada. Clique em &quot;Adicionar pergunta&quot; para começar.
          </p>
        </div>
      ) : (
        <div className="questions-list" role="list">
          {perguntas.map((p) => (
            <div
              key={p.tempId}
              className={`question-item ${draggingQuestionId === p.tempId ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => onDragStart(e, p.tempId)}
              onDragOver={(e) => onDragOver(e, p.tempId)}
              onDrop={(e) => onDrop(e, p.tempId)}
              onDragEnd={onDragEnd}
              role="listitem"
              aria-roledescription="pergunta"
            >
              <div className="question-main">
                <div className="question-header">
                  <div className="question-title">
                    <strong>#{p.ordem}</strong>&nbsp; — &nbsp;<span>{p.pergunta || '—'}</span>
                  </div>
                  <div className="question-meta">
                    <span className="meta-pill">{getModuloName(p.moduloTempId)}</span>
                    <span className="meta-pill subtle">{getCategoriaName(p.categoriaTempId)}</span>
                  </div>
                </div>

                <div className="question-responses" aria-hidden>
                  {p.respostas.map((r) => (
                    <span key={r.tempId} className="response-pill">
                      {r.resposta} <small>({r.valor})</small>
                    </span>
                  ))}
                </div>
              </div>

              <div className="question-actions">
                <button
                  type="button"
                  className="icon-btn edit"
                  onClick={() => onEdit(p.tempId)}
                  aria-label={`Editar pergunta ${p.pergunta}`}
                  title="Editar"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <button
                  type="button"
                  className="icon-btn remove"
                  onClick={() => onRemove(p.tempId)}
                  aria-label={`Remover pergunta ${p.pergunta}`}
                  title="Remover"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
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
        .empty-wrap {
          padding: 12px 10px;
        }
        .empty-text {
          margin: 0;
          color: #374151; /* visível como no modal */
          font-size: 14px;
          line-height: 1.5;
          opacity: 1; /* garantir visibilidade */
        }

        .questions-list { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }

        .question-item {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px 14px;
          border-radius: 10px;
          background: #fff;
          border: 1px solid #eef2f7;
          box-shadow: 0 6px 14px rgba(11,37,39,0.03);
          transition: transform .08s ease, box-shadow .08s ease;
        }
        .question-item.dragging {
          opacity: 0.85;
          transform: scale(0.997);
          box-shadow: 0 10px 26px rgba(11,37,39,0.08);
        }

        .question-main { flex: 1; display:flex; flex-direction:column; gap:8px; min-width:0; }

        .question-header { display:flex; justify-content:space-between; gap:12px; align-items:center; }
        .question-title { font-size:15px; color:#0B2527; font-weight:700; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .question-meta { display:flex; gap:8px; align-items:center; margin-left:8px; }

        .meta-pill {
          display:inline-block;
          font-size:12px;
          padding:6px 10px;
          border-radius:999px;
          background:#f3f7f7;
          border:1px solid #eef4f7;
          color:#0B2527;
          font-weight:600;
        }
        .meta-pill.subtle { background:#fff; color:#6b7280; border:1px solid #f0f3f4; font-weight:600; }

        .question-responses { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .response-pill {
          display:inline-flex;
          align-items:center;
          gap:6px;
          padding:6px 10px;
          border-radius:999px;
          background:#fafafa;
          border:1px solid #eef2f7;
          font-size:13px;
          color:#374151;
        }
        .response-pill small { color:#6b7280; font-size:11px; margin-left:4px; }

        .question-actions { display:flex; gap:8px; align-items:center; flex-shrink:0; }

        .icon-btn {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          width:36px;
          height:36px;
          border-radius:999px;
          background: #ffffff;
          border: 1px solid transparent;
          cursor:pointer;
          transition: all .12s ease;
          color: #0B2527;
        }
        .icon-btn:hover { transform: translateY(-1px); }
        .icon-btn:focus { outline: 3px solid rgba(11,37,39,0.12); outline-offset: 2px; }

        .icon-btn.remove { color: #dc2626; border-color: rgba(220,38,38,0.08); }
        .icon-btn.remove:hover { background: rgba(220,38,38,0.04); }

        @media (max-width: 720px) {
          .question-item { padding:10px 12px; }
          .response-pill { font-size:12px; padding:6px 8px; }
        }
      `}</style>
    </div>
  );
}
