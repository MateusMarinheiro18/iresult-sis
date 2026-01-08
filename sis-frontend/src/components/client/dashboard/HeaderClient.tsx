'use client';
import React from 'react';

export default function HeaderClient() {
  return (
    <header className="page-header">
      <div className="page-header-title">
        <div>
          <h1>Dashboard</h1>
          <p className="page-header-subtitle">Visão geral das escalas, trilhas e agendamentos</p>
        </div>
      </div>

      <style jsx>{`
        .page-header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 24px; 
        }
        .page-header-title h1 { 
          font-size: 1.6rem; 
          margin: 0; 
          color: #111827; 
          font-weight: 600; 
        }
        .page-header-subtitle { 
          margin: 4px 0 0; 
          color: #666; 
          font-size: 14px; 
        }
        @media (max-width: 640px) { 
          .page-header {
            flex-direction: column;
            align-items: flex-start;
          } 
        }
      `}</style>
    </header>
  );
}
