'use client';

import React from 'react';

export default function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="empty-state">
      <p className="empty-title">Nenhum relatório cadastrado</p>
      <p className="empty-text">Clique em "Novo Relatório" para cadastrar o primeiro relatório desta empresa.</p>
      <button className="btn-new-report" onClick={onNew}>Novo Relatório</button>

      <style jsx>{`
        .empty-state { background:#fff; border-radius:14px; box-shadow:0 6px 18px rgba(11,37,39,0.06); padding:24px; text-align:center; }
        .empty-title { margin:0 0 4px; font-size:15px; font-weight:600; color:#0b2527; }
        .empty-text { margin:0 0 12px; font-size:13px; color:#6b7280; }
        .btn-new-report { background:#0b2527; color:#fff; border-radius:999px; border:none; padding:8px 18px; font-weight:700; cursor:pointer; }
      `}</style>
    </div>
  );
}
