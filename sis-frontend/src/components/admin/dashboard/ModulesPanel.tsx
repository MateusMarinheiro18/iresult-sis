// File: src/components/admin/dashboard/ModulesPanel.tsx
import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { Modulo, Categoria } from '@/app/admin/dashboard/DashboardAdminPageClient';

function getCorClassificacao(classificacao: string) {
  switch (classificacao) {
    case 'FAVORAVEL': return '#4CAF50';
    case 'INTERMEDIARIO': return '#FFC107';
    case 'RISCO': return '#F44336';
    default: return '#999';
  }
}

function getLabelClassificacao(classificacao: string) {
  switch (classificacao) {
    case 'FAVORAVEL': return 'Favorável';
    case 'INTERMEDIARIO': return 'Intermediário';
    case 'RISCO': return 'Risco';
    default: return '';
  }
}

export default function ModulesPanel({ modulos, moduloSelecionado, categorias, loadingCategorias, onSelectModulo, onClearModulo }: { modulos: Modulo[]; moduloSelecionado: number | null; categorias: Categoria[]; loadingCategorias: boolean; onSelectModulo: (id: number) => void; onClearModulo: () => void; }) {
  const moduloAtual = modulos.find(m => m.id === moduloSelecionado);

  return (
    <>
      <div className="modules-panel" style={{ background: 'white', borderRadius: 16, padding: 24, border: '1px solid #e0e0e0' }}>
        {moduloSelecionado ? (
          <>
            <button onClick={onClearModulo} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: '#2E5D4E', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: '8px 0' }}>◀ Voltar aos módulos</button>
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a1a', margin: '0 0 8px 0' }}>{moduloAtual?.nome}</h3>
              <p style={{ fontSize: 14, color: '#666', margin: 0 }}>Média: {moduloAtual?.media.toFixed(2)} • {getLabelClassificacao(moduloAtual?.classificacao || '')}</p>
            </div>

            {loadingCategorias ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Carregando categorias...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {categorias.map(cat => (
                  <div key={cat.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, color: '#333', fontWeight: 500 }}>{cat.nome}</span>
                      <span style={{ fontSize: 14, color: '#666', fontWeight: 600 }}>{cat.media.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, background: '#F5F5F7', borderRadius: 8, height: 24, overflow: 'hidden' }}>
                        <div style={{ background: getCorClassificacao(cat.classificacao), height: '100%', width: `${(cat.media / 5) * 100}%`, transition: 'width 0.3s ease' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: getCorClassificacao(cat.classificacao), minWidth: 90, textAlign: 'right' }}>{getLabelClassificacao(cat.classificacao)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1a1a1a', marginBottom: 24 }}>Resultados por Módulo</h3>

            {modulos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📄</div>
                <p style={{ margin: 0 }}>Selecione uma escala para visualizar os módulos</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {modulos.map(modulo => (
                  <div key={modulo.id} onClick={() => onSelectModulo(modulo.id)} style={{ padding: 16, background: '#FAFAFA', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', border: '1px solid transparent' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F5F5F7'; (e.currentTarget as HTMLElement).style.borderColor = '#e0e0e0'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = '#FAFAFA'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 14, color: '#333', fontWeight: 600 }}>{modulo.nome}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 14, color: '#666', fontWeight: 600 }}>{modulo.media.toFixed(2)}</span>
                        <ChevronRight size={18} style={{ color: '#999' }} />
                      </div>
                    </div>
                    
                    {/* NOVO: Exibir apenas UMA barra com a cor da classificação */}
                    <div style={{ height: 8, background: '#F5F5F7', borderRadius: 4, overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${(modulo.media / 5) * 100}%`, 
                          background: getCorClassificacao(modulo.classificacao),
                          borderRadius: 4,
                          transition: 'width 0.3s ease'
                        }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          .modules-panel {
            padding: 16px !important;
          }
        }
      `}</style>
    </>
  );
}
