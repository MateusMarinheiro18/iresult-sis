'use client';

import React, { useState, useEffect } from 'react';
import { Search, Calendar, BookOpen, FileText, ChevronRight, ArrowLeft } from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

interface Empresa {
  id: number;
  razaoSocial: string;
}

interface Escala {
  id: number;
  nome: string;
  totalRespostas: number;
  totalDestinatarios: number;
  progressoPercentual: number;
}

interface Modulo {
  id: number;
  nome: string;
  media: number;
  classificacao: 'FAVORAVEL' | 'INTERMEDIARIO' | 'RISCO';
}

interface Categoria {
  id: number;
  nome: string;
  media: number;
  classificacao: 'FAVORAVEL' | 'INTERMEDIARIO' | 'RISCO';
}

interface Trilha {
  id: number;
  nome: string;
  progresso: number;
}

interface Agendamento {
  id: number;
  tipo: string;
  nome: string;
  data: string;
  horario: string;
}

interface DashboardData {
  empresas: Empresa[];
  escalas: Escala[];
  modulos: Modulo[];
  trilhas: Trilha[];
  agendamentos: Agendamento[];
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function DashboardAdmin() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [empresaSelecionada, setEmpresaSelecionada] = useState<number | null>(null);
  const [escalaSelecionada, setEscalaSelecionada] = useState<number | null>(null);
  
  // Drill-down
  const [moduloSelecionado, setModuloSelecionado] = useState<number | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);

  // ============================================================================
  // FETCH DADOS
  // ============================================================================

  useEffect(() => {
    fetchDashboardData();
  }, [empresaSelecionada, escalaSelecionada]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (empresaSelecionada) params.append('empresaId', empresaSelecionada.toString());
      if (escalaSelecionada) params.append('escalaId', escalaSelecionada.toString());

      const url = `/api/dashboard${params.toString() ? `?${params}` : ''}`;
      console.log('Fetching:', url); // DEBUG
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      alert(`Erro ao carregar dashboard: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategorias = async (moduloId: number) => {
    setLoadingCategorias(true);
    try {
      const params = new URLSearchParams();
      params.append('moduloId', moduloId.toString());
      if (empresaSelecionada) params.append('empresaId', empresaSelecionada.toString());

      const url = `/api/dashboard/categorias?${params}`;
      console.log('Fetching categorias:', url); // DEBUG
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setCategorias(result);
      setModuloSelecionado(moduloId);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      alert(`Erro ao carregar categorias: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoadingCategorias(false);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getCorClassificacao = (classificacao: string) => {
    switch (classificacao) {
      case 'FAVORAVEL': return '#4CAF50';
      case 'INTERMEDIARIO': return '#FFC107';
      case 'RISCO': return '#F44336';
      default: return '#999';
    }
  };

  const getLabelClassificacao = (classificacao: string) => {
    switch (classificacao) {
      case 'FAVORAVEL': return 'Favorável';
      case 'INTERMEDIARIO': return 'Intermediário';
      case 'RISCO': return 'Risco';
      default: return '';
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#F5F5F7'
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Carregando dashboard...</div>
      </div>
    );
  }

  if (!data) return null;

  const moduloAtual = data.modulos.find(m => m.id === moduloSelecionado);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#F5F5F7',
      padding: '32px 24px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* ============================================================================ */}
        {/* HEADER */}
        {/* ============================================================================ */}
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: '700', 
              color: '#1a1a1a',
              margin: '0 0 8px 0'
            }}>
              Dashboard
            </h1>
            <p style={{ 
              fontSize: '14px', 
              color: '#666',
              margin: 0
            }}>
              Visão geral das escalas, trilhas e agendamentos
            </p>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            background: 'white',
            borderRadius: '12px',
            padding: '8px 16px',
            border: '1px solid #e0e0e0'
          }}>
            <Search size={20} style={{ color: '#999', marginRight: '8px' }} />
            <input 
              type="text"
              placeholder="Buscar..."
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '14px',
                width: '200px'
              }}
            />
          </div>
        </div>

        {/* ============================================================================ */}
        {/* FILTROS */}
        {/* ============================================================================ */}
        
        <div style={{ 
          display: 'flex', 
          gap: '16px',
          marginBottom: '32px'
        }}>
          <select
            value={empresaSelecionada || ''}
            onChange={(e) => setEmpresaSelecionada(e.target.value ? Number(e.target.value) : null)}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              background: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            <option value="">Todas as empresas</option>
            {data.empresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.razaoSocial}</option>
            ))}
          </select>

          <select
            value={escalaSelecionada || ''}
            onChange={(e) => setEscalaSelecionada(e.target.value ? Number(e.target.value) : null)}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e0e0e0',
              background: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              minWidth: '200px'
            }}
          >
            <option value="">Todas as escalas</option>
            {data.escalas.map(esc => (
              <option key={esc.id} value={esc.id}>{esc.nome}</option>
            ))}
          </select>

          {(empresaSelecionada || escalaSelecionada) && (
            <button
              onClick={() => {
                setEmpresaSelecionada(null);
                setEscalaSelecionada(null);
              }}
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                background: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#666'
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* ============================================================================ */}
        {/* CARDS DE ESCALAS */}
        {/* ============================================================================ */}
        
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#333',
            marginBottom: '16px'
          }}>
            Escalas Ativas
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px'
          }}>
            {data.escalas.map(escala => (
              <div
                key={escala.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid #e0e0e0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: escalaSelecionada === escala.id ? '0 4px 12px rgba(46,93,78,0.15)' : 'none',
                  borderColor: escalaSelecionada === escala.id ? '#2E5D4E' : '#e0e0e0'
                }}
                onClick={() => setEscalaSelecionada(escala.id === escalaSelecionada ? null : escala.id)}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '16px'
                }}>
                  <div>
                    <h3 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600',
                      color: '#1a1a1a',
                      margin: '0 0 4px 0'
                    }}>
                      {escala.nome}
                    </h3>
                    <p style={{ 
                      fontSize: '13px', 
                      color: '#666',
                      margin: 0
                    }}>
                      {escala.totalRespostas} de {escala.totalDestinatarios} respostas
                    </p>
                  </div>
                  
                  <div style={{
                    background: escala.progressoPercentual >= 70 ? '#E8F5E9' : 
                               escala.progressoPercentual >= 40 ? '#FFF9E6' : '#FFEBEE',
                    color: escala.progressoPercentual >= 70 ? '#2E7D32' :
                           escala.progressoPercentual >= 40 ? '#F57C00' : '#C62828',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    {escala.progressoPercentual}%
                  </div>
                </div>

                <div style={{ 
                  background: '#F5F5F7',
                  borderRadius: '8px',
                  height: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: escala.progressoPercentual >= 70 ? '#4CAF50' :
                               escala.progressoPercentual >= 40 ? '#FFC107' : '#F44336',
                    height: '100%',
                    width: `${escala.progressoPercentual}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ============================================================================ */}
        {/* LAYOUT PRINCIPAL: ESCALAS | TRILHAS + AGENDAMENTOS */}
        {/* ============================================================================ */}
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 400px',
          gap: '24px'
        }}>
          
          {/* ============================================================================ */}
          {/* SEÇÃO ESCALAS - MÓDULOS/CATEGORIAS */}
          {/* ============================================================================ */}
          
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e0e0e0'
          }}>
            {moduloSelecionado ? (
              // DRILL-DOWN: Categorias
              <>
                <button
                  onClick={() => {
                    setModuloSelecionado(null);
                    setCategorias([]);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    color: '#2E5D4E',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginBottom: '16px',
                    padding: '8px 0'
                  }}
                >
                  <ArrowLeft size={18} style={{ marginRight: '8px' }} />
                  Voltar aos módulos
                </button>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ 
                    fontSize: '20px', 
                    fontWeight: '600',
                    color: '#1a1a1a',
                    margin: '0 0 8px 0'
                  }}>
                    {moduloAtual?.nome}
                  </h3>
                  <p style={{ 
                    fontSize: '14px', 
                    color: '#666',
                    margin: 0
                  }}>
                    Média: {moduloAtual?.media.toFixed(2)} • {getLabelClassificacao(moduloAtual?.classificacao || '')}
                  </p>
                </div>

                {loadingCategorias ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    Carregando categorias...
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {categorias.map(cat => (
                      <div key={cat.id}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          marginBottom: '8px'
                        }}>
                          <span style={{ fontSize: '14px', color: '#333', fontWeight: '500' }}>
                            {cat.nome}
                          </span>
                          <span style={{ fontSize: '14px', color: '#666', fontWeight: '600' }}>
                            {cat.media.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <div style={{ 
                            flex: 1,
                            background: '#F5F5F7',
                            borderRadius: '8px',
                            height: '24px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              background: getCorClassificacao(cat.classificacao),
                              height: '100%',
                              width: `${(cat.media / 5) * 100}%`,
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: getCorClassificacao(cat.classificacao),
                            minWidth: '90px',
                            textAlign: 'right'
                          }}>
                            {getLabelClassificacao(cat.classificacao)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // VISÃO PADRÃO: Módulos
              <>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '24px'
                }}>
                  Resultados por Módulo
                </h3>

                {data.modulos.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px',
                    color: '#999'
                  }}>
                    <FileText size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                    <p style={{ margin: 0 }}>
                      Selecione uma escala para visualizar os módulos
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {data.modulos.map(modulo => (
                      <div
                        key={modulo.id}
                        onClick={() => fetchCategorias(modulo.id)}
                        style={{
                          padding: '16px',
                          background: '#FAFAFA',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          border: '1px solid transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F5F5F7';
                          e.currentTarget.style.borderColor = '#e0e0e0';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#FAFAFA';
                          e.currentTarget.style.borderColor = 'transparent';
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '12px'
                        }}>
                          <span style={{ 
                            fontSize: '14px', 
                            color: '#333',
                            fontWeight: '600'
                          }}>
                            {modulo.nome}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ 
                              fontSize: '14px', 
                              color: '#666',
                              fontWeight: '600'
                            }}>
                              {modulo.media.toFixed(2)}
                            </span>
                            <ChevronRight size={18} style={{ color: '#999' }} />
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '4px', height: '8px' }}>
                          <div style={{ 
                            flex: modulo.classificacao === 'FAVORAVEL' ? 1 : 0.3,
                            background: modulo.classificacao === 'FAVORAVEL' ? '#4CAF50' : '#E0E0E0',
                            borderRadius: '4px',
                            transition: 'all 0.3s'
                          }} />
                          <div style={{ 
                            flex: modulo.classificacao === 'INTERMEDIARIO' ? 1 : 0.3,
                            background: modulo.classificacao === 'INTERMEDIARIO' ? '#FFC107' : '#E0E0E0',
                            borderRadius: '4px',
                            transition: 'all 0.3s'
                          }} />
                          <div style={{ 
                            flex: modulo.classificacao === 'RISCO' ? 1 : 0.3,
                            background: modulo.classificacao === 'RISCO' ? '#F44336' : '#E0E0E0',
                            borderRadius: '4px',
                            transition: 'all 0.3s'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ============================================================================ */}
          {/* COLUNA LATERAL: TRILHAS + AGENDAMENTOS */}
          {/* ============================================================================ */}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* TRILHAS */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <BookOpen size={20} style={{ color: '#2E5D4E', marginRight: '8px' }} />
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: '#1a1a1a',
                  margin: 0
                }}>
                  Trilhas
                </h3>
              </div>

              {data.trilhas.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#999', textAlign: 'center', padding: '20px 0' }}>
                  Nenhuma trilha disponível
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {data.trilhas.map(trilha => (
                    <div key={trilha.id}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}>
                        <span style={{ fontSize: '14px', color: '#333' }}>
                          {trilha.nome}
                        </span>
                        <span style={{ 
                          fontSize: '13px', 
                          color: '#666',
                          fontWeight: '600'
                        }}>
                          {trilha.progresso}%
                        </span>
                      </div>
                      <div style={{ 
                        background: '#F5F5F7',
                        borderRadius: '8px',
                        height: '8px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          background: '#2E5D4E',
                          height: '100%',
                          width: `${trilha.progresso}%`,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AGENDAMENTOS */}
            <div style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <Calendar size={20} style={{ color: '#2E5D4E', marginRight: '8px' }} />
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: '#1a1a1a',
                  margin: 0
                }}>
                  Agendamentos
                </h3>
              </div>

              {data.agendamentos.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#999', textAlign: 'center', padding: '20px 0' }}>
                  Nenhum agendamento próximo
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {data.agendamentos.map(agendamento => (
                    <div 
                      key={agendamento.id}
                      style={{
                        padding: '16px',
                        background: '#FAFAFA',
                        borderRadius: '12px',
                        borderLeft: `4px solid ${
                          agendamento.tipo === 'Palestra' ? '#4CAF50' :
                          agendamento.tipo === 'Vídeo' ? '#FFC107' : '#2196F3'
                        }`
                      }}
                    >
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#999',
                        marginBottom: '4px',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        {agendamento.tipo}
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#333',
                        fontWeight: '600',
                        marginBottom: '8px'
                      }}>
                        {agendamento.nome}
                      </div>
                      <div style={{ 
                        display: 'flex',
                        gap: '16px',
                        fontSize: '13px',
                        color: '#666'
                      }}>
                        <span>📅 {agendamento.data}</span>
                        <span>🕐 {agendamento.horario}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}