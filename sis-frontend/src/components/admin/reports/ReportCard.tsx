'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useConfirm } from '@/components/ui/ConfirmProvider';

type Report = { id: number; titulo: string; dataPublicacao?: string | null };

export default function ReportCard({
  report,
  onOpen,
  onEdit,
  onDelete,
}: {
  report: Report;
  onOpen: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const confirm = useConfirm();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleDelete() {
    if (deleting) return;
    const ok = await confirm({
      title: 'Excluir relatório',
      description: 'Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await onDelete(report.id);
    } finally {
      setDeleting(false);
      setOpen(false);
    }
  }

  function formatDate(dateStr?: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR',{ day:'2-digit', month:'2-digit', year:'numeric' }).format(d);
  }

  return (
    <div className="report-card" ref={ref}>
      <div className="report-header">
        <div className="report-texts">
          <h3 className="report-title">{report.titulo}</h3>
          {report.dataPublicacao && <p className="report-date">Publicado em {formatDate(report.dataPublicacao)}</p>}
        </div>

        <div className="menu-wrapper">
          <button className="menu-btn" onClick={() => setOpen((p) => !p)} aria-label="Mais ações">
            <span />
            <span />
            <span />
          </button>

          {open && (
            <div className="menu-dropdown" role="menu">
              <button className="menu-item" onClick={() => { setOpen(false); onEdit(report.id); }} disabled={deleting}>Editar</button>
              <button className="menu-item delete" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="report-footer">
        <button className="open-btn" onClick={() => onOpen(report.id)}>Abrir</button>
      </div>

      <style jsx>{`
        .report-card { background:#062123; border-radius:18px; padding:18px 20px; display:flex; flex-direction:column; justify-content:space-between; height:150px; overflow:hidden; }
        .report-header { display:flex; justify-content:space-between; align-items:flex-start; gap:8px; }
        .report-title { margin:0 0 4px; font-size:16px; font-weight:700; color:#f9fafb; word-break:break-word; }
        .report-date { margin:0; font-size:12px; color:#e5e7eb; }
        .menu-wrapper { position:relative; flex-shrink:0; }
        .menu-btn { width:28px; height:28px; border-radius:999px; border:none; background:transparent; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; gap:2px; }
        .menu-btn span { width:3px; height:3px; border-radius:999px; background:#e5e7eb; display:block; }
        .menu-dropdown { position:absolute; top:32px; right:0; background:#fff; border-radius:10px; box-shadow:0 10px 30px rgba(15,23,42,0.4); padding:6px 0; min-width:140px; z-index:20; }
        .menu-item { width:100%; border:none; background:transparent; padding:8px 14px; text-align:left; font-size:13px; color:#111827; cursor:pointer; }
        .menu-item:hover { background:#f3f4ff; }
        .menu-item.delete { color:#b91c1c; }
        .report-footer { margin-top:16px; display:flex; justify-content:center; }
        .open-btn { border:none; border-radius:999px; padding:8px 32px; font-size:14px; font-weight:600; cursor:pointer; background:#fff; color:#0b2527; box-shadow:0 4px 10px rgba(0,0,0,0.18); }
      `}</style>
    </div>
  );
}
