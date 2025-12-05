// File: src/components/admin/dashboard/SidebarPanel.tsx
import React from 'react';
import type { Trilha, Agendamento } from '@/app/admin/dashboard/DashboardAdminPageClient';
import { BookOpen, Calendar } from 'lucide-react';

export default function SidebarPanel({ trilhas, agendamentos }: { trilhas: Trilha[]; agendamentos: Agendamento[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <BookOpen size={20} style={{ color: '#2E5D4E', marginRight: 8 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Trilhas</h3>
        </div>
        {trilhas.length === 0 ? (
          <p style={{ fontSize: 14, color: '#999', textAlign: 'center', padding: '20px 0' }}>Nenhuma trilha disponível</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {trilhas.map(t => (
              <div key={t.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, color: '#333' }}>{t.nome}</span>
                  <span style={{ fontSize: 13, color: '#666', fontWeight: 600 }}>{t.progresso}%</span>
                </div>
                <div style={{ background: '#F5F5F7', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                  <div style={{ background: '#2E5D4E', height: '100%', width: `${t.progresso}%`, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #e0e0e0' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <Calendar size={20} style={{ color: '#2E5D4E', marginRight: 8 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Agendamentos</h3>
        </div>
        {agendamentos.length === 0 ? (
          <p style={{ fontSize: 14, color: '#999', textAlign: 'center', padding: '20px 0' }}>Nenhum agendamento próximo</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {agendamentos.map(a => (
              <div key={a.id} style={{ padding: 16, background: '#FAFAFA', borderRadius: 12, borderLeft: `4px solid ${a.tipo === 'Palestra' ? '#4CAF50' : a.tipo === 'Vídeo' ? '#FFC107' : '#2196F3'}` }}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>{a.tipo}</div>
                <div style={{ fontSize: 14, color: '#333', fontWeight: 600, marginBottom: 8 }}>{a.nome}</div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#666' }}>
                  <span>📅 {a.data}</span>
                  <span>🕐 {a.horario}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
