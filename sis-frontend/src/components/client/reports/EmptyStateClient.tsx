'use client';
import React from 'react';

export default function EmptyStateClient() {
  return (
    <div className="empty-state">
      <p className="empty-title">Nenhum relatório disponível</p>
      <p className="empty-text">Nenhum relatório foi publicado para sua empresa ainda.</p>

      <style jsx>{`
        .empty-state {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
          padding: 24px;
          text-align: center;
          position: relative;
          display: inline-block;
          min-width: 100%;
          color: #6b7280;
        }
        .empty-title { margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #0b2527; }
        .empty-text { margin: 0; font-size: 13px; }
      `}</style>
    </div>
  );
}
