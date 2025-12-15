'use client';
import React from 'react';

type Report = { id: number; titulo: string; dataPublicacao?: string | null };

export default function ReportCardClient({
  report,
  onOpen,
}: {
  report: Report;
  onOpen: (id: number) => void;
}) {
  function formatDate(dateStr?: string | null) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
    } catch {
      return '';
    }
  }

  return (
    <div className="report-card">
      <div className="report-header">
        <div className="report-texts">
          <h3 className="report-title">{report.titulo}</h3>
          {report.dataPublicacao && <p className="report-date">Publicado em {formatDate(report.dataPublicacao)}</p>}
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
        .report-footer { margin-top:16px; display:flex; justify-content:center; }
        .open-btn { border:none; border-radius:999px; padding:8px 32px; font-size:14px; font-weight:600; cursor:pointer; background:#fff; color:#0b2527; box-shadow:0 4px 10px rgba(0,0,0,0.18); }
      `}</style>
    </div>
  );
}
