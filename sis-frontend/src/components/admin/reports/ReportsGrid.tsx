'use client';

import React from 'react';
import ReportCard from './ReportCard';

type Report = { id: number; titulo: string; dataPublicacao?: string | null };

export default function ReportsGrid({
  reports,
  onOpen,
  onEdit,
  onDelete,
}: {
  reports: Report[];
  onOpen: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="reports-grid">
      {reports.map((r) => (
        <ReportCard key={r.id} report={r} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} />
      ))}

      <style jsx>{`
        .reports-grid {
          display:grid;
          grid-template-columns:repeat(1, minmax(0,1fr));
          gap:16px;
        }
        @media (min-width:640px){ .reports-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
        @media (min-width:1024px){ .reports-grid { grid-template-columns: repeat(3, minmax(0,1fr)); } }
      `}</style>
    </div>
  );
}
