'use client';
import React from 'react';

export default function CompanyReportsHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
}) {
  return (
    <div className="header-row">
      <div>
        <h1 className="title">{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>

      <style jsx>{`
        .header-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; gap:12px; flex-wrap:wrap; }
        .title { font-size:20px; font-weight:700; color:#0b2527; margin:0; }
        .subtitle { margin:4px 0 0; font-size:13px; color:#4b5563; }
        .back-btn { display:inline-flex; align-items:center; gap:6px; color:#0b2527; border:none; border-radius:8px; font-size:14px; font-weight:600; padding:8px 14px; cursor:pointer; background:transparent; }
        .back-btn svg { stroke:#0b2527; }
      `}</style>
    </div>
  );
}
