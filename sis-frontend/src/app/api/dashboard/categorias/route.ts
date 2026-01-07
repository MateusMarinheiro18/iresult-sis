// app/api/admin/dashboard/categorias/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        valorFinalRisco: true,
        idEscala: true
      }
    });

    if (!modulo) {
      return NextResponse.json(
        { error: 'Módulo não encontrado' },
        { status: 404 }
      );
    }

    // ========================================================================
    // 2. BUSCAR dataEnvio SE HOUVER FILTRO DE EMPRESA
    // ========================================================================
    let dataEnvioCategorias: Date | null = null;
    
    if (empresaId) {
      const vinculoCategorias = await prisma.escalaHasEmpresa.findUnique({
        where: {
          idEscala_idEmpresa: {
            idEscala: modulo.idEscala,
            idEmpresa: Number(empresaId)
          }
        },
        select: { dataEnvio: true }
      });
      dataEnvioCategorias = vinculoCategorias?.dataEnvio || null;
      console.log(`\n🔍 DATA DE ENVIO (categorias): ${dataEnvioCategorias ? dataEnvioCategorias.toISOString() : 'NULL'}`);
    }

    // ========================================================================
    // 3. BUSCAR CATEGORIAS DO MÓDULO
    // ========================================================================
    const categoriasRaw = await prisma.escalaCategoria.findMany({
      where: {
        idModulo: Number(moduloId),
        ativo: 1
      },
      select: {
        id: true,
        nome: true
      },
      orderBy: { nome: 'asc' }
    });

    // ========================================================================
    // 4. CALCULAR MÉDIA E CLASSIFICAÇÃO DE CADA CATEGORIA
    // ========================================================================
    const categoriasPromises = categoriasRaw.map(async (categoria: any) => {
      // CORREÇÃO: usar o relacionamento many-to-many correto
      const whereRespostas: any = {
        ativo: 1,
        pergunta: {
          ativo: 1,
          categoriasRel: {
            some: {
              idCategoria: categoria.id
            }
          }
        }
      };
      
      if (empresaId) whereRespostas.idEmpresa = Number(empresaId);
      if (dataEnvioCategorias) {
        whereRespostas.dataResposta = { gte: dataEnvioCategorias };
        console.log(`✅ Filtrando categorias >= ${dataEnvioCategorias.toISOString()}`);
      } else {
        console.log(`⚠️ Sem filtro de empresa - pegando TODAS as respostas`);
      }

      const respostas = await prisma.respostaFuncionario.findMany({
        where: whereRespostas,
        select: {
          dataResposta: true,
          respostaPossivel: {
            select: { valor: true }
          }
        }
      });

      const valores: number[] = [];
      
      console.log(`\n=== CATEGORIA: ${categoria.nome} ===`);
      console.log(`Total de respostas: ${respostas.length}`);
      
      respostas.forEach((resp: any) => {
        const valor = resp.respostaPossivel?.valor;
        const dataResp = resp.dataResposta ? new Date(resp.dataResposta).toISOString() : 'NULL';
        
        console.log(`  - Data: ${dataResp} | Valor: ${valor}`);
        
        if (valor !== null && valor !== undefined) {
          valores.push(Number(valor));
        }
      });

      console.log(`Valores: [${valores.join(', ')}]`);

      const media = valores.length > 0
        ? valores.reduce((sum: number, v: number) => sum + v, 0) / valores.length
        : 0;

      console.log(`Média: ${media.toFixed(2)}\n`);

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

    const categorias = await Promise.all(categoriasPromises);

    return NextResponse.json(categorias);

  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar categorias' },
      { status: 500 }
    );
  }
}