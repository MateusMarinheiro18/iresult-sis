'use client';

import React from 'react';

export default function SearchBox({
  value,
  onChange,
  placeholder = 'Buscar',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search-box" role="search" aria-label="Buscar">
      <div className="search-icon" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M21 21l-4.35-4.35" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="11" cy="11" r="6" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <input className="search-input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />

      <style jsx>{`
        .search-box {
          display:flex; align-items:center; background:#fff; padding:8px 12px; border-radius:999px; box-shadow:0 2px 8px rgba(11,37,39,0.04); border:1px solid rgba(11,37,39,0.04); min-width:220px; max-width:420px; width:100%; box-sizing:border-box;
        }
        .search-icon { margin-right:10px; display:inline-flex; align-items:center; justify-content:center; }
        .search-input { border:none; outline:none; font-size:14px; flex:1; color:#111827; background:transparent; }
        .search-input::placeholder { color:#9ca3af; }
      `}</style>
    </div>
  );
}
