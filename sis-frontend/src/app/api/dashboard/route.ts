// app/api/admin/dashboard/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface WhereEscala {
  ativo: number;
  empresas?: { some: { idEmpresa: number } };
  id?: number;
}

interface WhereTrilha {
  ativo: number;
  empresas?: { some: { idEmpresa: number } };
}

interface WhereAgendamento {
  ativo: number;
  data: { gte: Date };
  trilha?: {
    empresas: {
      some: { idEmpresa: number };
    };
  };
}

interface EmpresaRelacao {
  totalDestinatarios: number | null;
}

interface RespostaFuncionario {
  respostaPossivel: {
    valor: number | null;
  } | null;
}

interface Pergunta {
  id: number;
  respostasFuncionarios: RespostaFuncionario[];
}

interface ModuloRaw {
  id: number;
  nome: string;
  valorInicialFavoravel: any;
  valorFinalFavoravel: any;
  valorInicialIntermediario: any;
  valorFinalIntermediario: any;
  valorInicialRisco: any;
  valorFinalRisco: any;
  perguntas: Pergunta[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const escalaId = searchParams.get('escalaId');

    // ========================================================================
    // 1. BUSCAR EMPRESAS
    // ========================================================================
    const empresas = await prisma.empresa.findMany({
      where: { ativo: 1 },
      select: { 
        id: true, 
        razaoSocial: true 
      },
      orderBy: { razaoSocial: 'asc' }
    });

    // ========================================================================
    // 2. BUSCAR ESCALAS COM PROGRESSO
    // ========================================================================
    const whereEscala: WhereEscala = { ativo: 1 };
    
    if (empresaId) {
      whereEscala.empresas = {
        some: { idEmpresa: Number(empresaId) }
      };
    }
    if (escalaId) {
      whereEscala.id = Number(escalaId);
    }

    const escalasRaw = await prisma.escala.findMany({
      where: whereEscala,
      select: {
        id: true,
        nome: true,
        empresas: {
          where: empresaId ? { idEmpresa: Number(empresaId) } : {},
          select: {
            totalDestinatarios: true
          }
        },
        respostas: {
          where: empresaId ? { idEmpresa: Number(empresaId) } : {},
          select: { id: true }
        }
      },
      orderBy: { nome: 'asc' }
    });

    const escalas = escalasRaw.map((escala) => {
      const totalDestinatarios = escala.empresas.reduce(
        (sum: number, e: EmpresaRelacao) => 
          sum + (e.totalDestinatarios || 0), 
        0
      );
      const totalRespostas = escala.respostas.length;
      const progressoPercentual = totalDestinatarios > 0 
        ? Math.round((totalRespostas / totalDestinatarios) * 100)
        : 0;

      return {
        id: escala.id,
        nome: escala.nome,
        totalRespostas,
        totalDestinatarios,
        progressoPercentual
      };
    });

    // ========================================================================
    // 3. BUSCAR MÓDULOS (se escala selecionada)
    // ========================================================================
    let modulos: Array<{
      id: number;
      nome: string;
      media: number;
      classificacao: string;
    }> = [];

    if (escalaId) {
      const modulosRaw = await prisma.escalaModulo.findMany({
        where: { 
          idEscala: Number(escalaId),
          ativo: 1
        },
        select: {
          id: true,
          nome: true,
          valorInicialFavoravel: true,
          valorFinalFavoravel: true,
          valorInicialIntermediario: true,
          valorFinalIntermediario: true,
          valorInicialRisco: true,
          valorFinalRisco: true,
          perguntas: {
            where: { ativo: 1 },
            select: {
              id: true,
              respostasFuncionarios: {
                where: {
                  ativo: 1,
                  ...(empresaId ? { idEmpresa: Number(empresaId) } : {})
                },
                select: {
                  respostaPossivel: {
                    select: { valor: true }
                  }
                }
              }
            }
          }
        }
      });

      modulos = modulosRaw.map((modulo: ModuloRaw) => {
        // Calcular média de todas as respostas do módulo
        const valores: number[] = [];
        modulo.perguntas.forEach((pergunta: Pergunta) => {
          pergunta.respostasFuncionarios.forEach((resposta: RespostaFuncionario) => {
            if (resposta.respostaPossivel?.valor) {
              valores.push(resposta.respostaPossivel.valor);
            }
          });
        });

        const media = valores.length > 0
          ? valores.reduce((sum: number, v: number) => sum + v, 0) / valores.length
          : 0;

        // Classificar baseado nos ranges
        let classificacao = 'INTERMEDIARIO';
        
        if (
          modulo.valorInicialFavoravel && 
          modulo.valorFinalFavoravel &&
          media >= Number(modulo.valorInicialFavoravel) && 
          media <= Number(modulo.valorFinalFavoravel)
        ) {
          classificacao = 'FAVORAVEL';
        } else if (
          modulo.valorInicialRisco && 
          modulo.valorFinalRisco &&
          media >= Number(modulo.valorInicialRisco) && 
          media <= Number(modulo.valorFinalRisco)
        ) {
          classificacao = 'RISCO';
        }

        return {
          id: modulo.id,
          nome: modulo.nome,
          media: Number(media.toFixed(2)),
          classificacao
        };
      });
    }

    // ========================================================================
    // 4. BUSCAR TRILHAS
    // ========================================================================
    const whereTrilha: WhereTrilha = { ativo: 1 };
    
    if (empresaId) {
      whereTrilha.empresas = {
        some: { idEmpresa: Number(empresaId) }
      };
    }

    const trilhasRaw = await prisma.trilha.findMany({
      where: whereTrilha,
      select: {
        id: true,
        nome: true,
        itens: {
          where: { ativo: 1 },
          select: { id: true }
        }
      },
      orderBy: { nome: 'asc' }
    });

    const trilhas = trilhasRaw.map((trilha) => ({
      id: trilha.id,
      nome: trilha.nome,
      progresso: trilha.itens.length > 0 ? Math.round(Math.random() * 100) : 0 
      // TODO: Implementar lógica real de progresso quando houver controle
    }));

    // ========================================================================
    // 5. BUSCAR AGENDAMENTOS (próximos 5)
    // ========================================================================
    const hoje = new Date();
    const whereAgendamento: WhereAgendamento = { 
      ativo: 1,
      data: { gte: hoje }
    };
    
    if (empresaId) {
      whereAgendamento.trilha = {
        empresas: {
          some: { idEmpresa: Number(empresaId) }
        }
      };
    }

    const agendamentosRaw = await prisma.trilhaItem.findMany({
      where: whereAgendamento,
      select: {
        id: true,
        tipo: true,
        nome: true,
        data: true
      },
      orderBy: { data: 'asc' },
      take: 5
    });

    const agendamentos = agendamentosRaw.map((item) => ({
      id: item.id,
      tipo: item.tipo || 'Evento',
      nome: item.nome,
      data: item.data 
        ? new Date(item.data).toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
          })
        : '',
      horario: item.data
        ? new Date(item.data).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          })
        : ''
    }));

    // ========================================================================
    // RESPOSTA
    // ========================================================================
    return NextResponse.json({
      empresas,
      escalas,
      modulos,
      trilhas,
      agendamentos
    });

  } catch (error) {
    console.error('Erro no dashboard:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar dashboard' },
      { status: 500 }
    );
  }
}