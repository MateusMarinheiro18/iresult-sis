// app/api/admin/dashboard/categorias/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RespostaFuncionario {
  respostaPossivel: {
    valor: number | null;
  } | null;
}

interface Pergunta {
  id: number;
  respostasFuncionarios: RespostaFuncionario[];
}

interface CategoriaRaw {
  id: number;
  nome: string;
  perguntas: Pergunta[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const moduloId = searchParams.get('moduloId');
    const empresaId = searchParams.get('empresaId');

    if (!moduloId) {
      return NextResponse.json(
        { error: 'moduloId é obrigatório' },
        { status: 400 }
      );
    }

    // ========================================================================
    // 1. BUSCAR MÓDULO PARA PEGAR OS RANGES
    // ========================================================================
    const modulo = await prisma.escalaModulo.findUnique({
      where: { id: Number(moduloId) },
      select: {
        valorInicialFavoravel: true,
        valorFinalFavoravel: true,
        valorInicialIntermediario: true,
        valorFinalIntermediario: true,
        valorInicialRisco: true,
        valorFinalRisco: true
      }
    });

    if (!modulo) {
      return NextResponse.json(
        { error: 'Módulo não encontrado' },
        { status: 404 }
      );
    }

    // ========================================================================
    // 2. BUSCAR CATEGORIAS DO MÓDULO
    // ========================================================================
    const categoriasRaw = await prisma.escalaCategoria.findMany({
      where: {
        idModulo: Number(moduloId),
        ativo: 1
      },
      select: {
        id: true,
        nome: true,
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
      },
      orderBy: { nome: 'asc' }
    });

    // ========================================================================
    // 3. CALCULAR MÉDIA E CLASSIFICAÇÃO DE CADA CATEGORIA
    // ========================================================================
    const categorias = categoriasRaw.map((categoria: CategoriaRaw) => {
      // Coletar todos os valores das respostas
      const valores: number[] = [];
      categoria.perguntas.forEach((pergunta: Pergunta) => {
        pergunta.respostasFuncionarios.forEach((resposta: RespostaFuncionario) => {
          if (resposta.respostaPossivel?.valor) {
            valores.push(resposta.respostaPossivel.valor);
          }
        });
      });

      // Calcular média
      const media = valores.length > 0
        ? valores.reduce((sum: number, v: number) => sum + v, 0) / valores.length
        : 0;

      // Classificar usando os MESMOS ranges do módulo pai
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
        id: categoria.id,
        nome: categoria.nome,
        media: Number(media.toFixed(2)),
        classificacao
      };
    });

    return NextResponse.json(categorias);

  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar categorias' },
      { status: 500 }
    );
  }
}