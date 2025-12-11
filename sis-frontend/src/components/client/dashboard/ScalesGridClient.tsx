'use client';
import React from 'react';

type Escala = { id: number; nome: string; totalRespostas: number; totalDestinatarios: number; progressoPercentual: number };

export default function ScalesGridClient({ escalas }: { escalas: Escala[] }) {
  return (
    <>
      <div className="scales-grid">
        {escalas.map(escala => (
          <div 
            key={escala.id} 
            style={{ 
              background: 'white', 
              borderRadius: 12, 
              padding: 20, 
              border: '1px solid #e0e0e0'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: '0 0 4px 0' }}>{escala.nome}</h3>
                <p style={{ fontSize: 13, color: '#666', margin: 0 }}>{escala.totalRespostas} de {escala.totalDestinatarios} respostas</p>
              </div>
              <div 
                style={{ 
                  background: escala.progressoPercentual >= 70 ? '#E8F5E9' : escala.progressoPercentual >= 40 ? '#FFF9E6' : '#FFEBEE', 
                  color: escala.progressoPercentual >= 70 ? '#2E7D32' : escala.progressoPercentual >= 40 ? '#F57C00' : '#C62828', 
                  padding: '6px 12px', 
                  borderRadius: 20, 
                  fontSize: 13, 
                  fontWeight: 600 
                }}
              >
                {escala.progressoPercentual}%
              </div>
            </div>
            <div style={{ background: '#F5F5F7', borderRadius: 8, height: 8, overflow: 'hidden' }}>
              <div 
                style={{ 
                  background: escala.progressoPercentual >= 70 ? '#4CAF50' : escala.progressoPercentual >= 40 ? '#FFC107' : '#F44336', 
                  height: '100%', 
                  width: `${escala.progressoPercentual}%`, 
                  transition: 'width 0.3s ease' 
                }} 
              />
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .scales-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        @media (max-width: 768px) {
          .scales-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
