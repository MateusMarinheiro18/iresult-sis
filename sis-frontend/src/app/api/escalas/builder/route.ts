import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type RespostaPayload = {
  resposta: string;
  valor: number;
};

type PerguntaPayload = {
  tempId: string;
  pergunta: string;
  ordem: number;
  moduloTempId: string;
  categoriaTempId: string;
  respostas: RespostaPayload[];
};

type CategoriaPayload = {
  tempId: string;
  nome: string;
  moduloTempId: string;
};

type ModuloPayload = {
  tempId: string;
  nome: string;
  valorInicialFavoravel: string | null;
  valorFinalFavoravel: string | null;
  valorInicialIntermediario: string | null;
  valorFinalIntermediario: string | null;
  valorInicialRisco: string | null;
  valorFinalRisco: string | null;
};

type EscalaPayload = {
  nome: string;
  dataVencimento: string | null;
  ativo: number;
  modulos: ModuloPayload[];
  categorias: CategoriaPayload[];
  perguntas: PerguntaPayload[];
};

export async function POST(req: NextRequest) {
  try {
    const body: EscalaPayload = await req.json();

    // Validações básicas
    if (!body.nome?.trim()) {
      return NextResponse.json(
        { error: 'Nome da escala é obrigatório.' },
        { status: 400 }
      );
    }

    if (!body.modulos?.length) {
      return NextResponse.json(
        { error: 'A escala deve ter pelo menos um módulo.' },
        { status: 400 }
      );
    }

    if (!body.perguntas?.length) {
      return NextResponse.json(
        { error: 'A escala deve ter pelo menos uma pergunta.' },
        { status: 400 }
      );
    }

    // Criar escala e toda estrutura em transação
    const result = await prisma.$transaction(async (tx) => {
      // 1. Criar escala
      const escala = await tx.escala.create({
        data: {
          nome: body.nome.trim(),
          dataVencimento: body.dataVencimento
            ? new Date(body.dataVencimento)
            : null,
          ativo: body.ativo ?? 1,
          created: new Date(),
          createdBy: 1, // TODO: pegar do auth
        },
      });

      // 2. Criar módulos e mapear tempId -> id real
      const moduloMap = new Map<string, number>();
      for (const mod of body.modulos) {
        const modulo = await tx.escalaModulo.create({
          data: {
            nome: mod.nome.trim(),
            idEscala: escala.id,
            valorInicialFavoravel: mod.valorInicialFavoravel
              ? parseFloat(mod.valorInicialFavoravel)
              : null,
            valorFinalFavoravel: mod.valorFinalFavoravel
              ? parseFloat(mod.valorFinalFavoravel)
              : null,
            valorInicialIntermediario: mod.valorInicialIntermediario
              ? parseFloat(mod.valorInicialIntermediario)
              : null,
            valorFinalIntermediario: mod.valorFinalIntermediario
              ? parseFloat(mod.valorFinalIntermediario)
              : null,
            valorInicialRisco: mod.valorInicialRisco
              ? parseFloat(mod.valorInicialRisco)
              : null,
            valorFinalRisco: mod.valorFinalRisco
              ? parseFloat(mod.valorFinalRisco)
              : null,
            ativo: 1,
            created: new Date(),
            createdBy: 1,
          },
        });
        moduloMap.set(mod.tempId, modulo.id);
      }

      // 3. Criar categorias e mapear tempId -> id real
      const categoriaMap = new Map<string, number>();
      for (const cat of body.categorias) {
        const idModulo = moduloMap.get(cat.moduloTempId);
        if (!idModulo) {
          throw new Error(
            `Módulo não encontrado para categoria ${cat.nome}`
          );
        }

        const categoria = await tx.escalaCategoria.create({
          data: {
            nome: cat.nome.trim(),
            idModulo,
            ativo: 1,
            created: new Date(),
            createdBy: 1,
          },
        });
        categoriaMap.set(cat.tempId, categoria.id);
      }

      // 4. Criar perguntas e respostas
      for (const perg of body.perguntas) {
        const idModulo = moduloMap.get(perg.moduloTempId);
        const idCategoria = categoriaMap.get(perg.categoriaTempId);

        if (!idModulo) {
          throw new Error(
            `Módulo não encontrado para pergunta: ${perg.pergunta}`
          );
        }

        if (!idCategoria) {
          throw new Error(
            `Categoria não encontrada para pergunta: ${perg.pergunta}`
          );
        }

        const pergunta = await tx.escalaPergunta.create({
          data: {
            pergunta: perg.pergunta.trim(),
            idEscala: escala.id,
            idModulo,
            idCategoria,
            ordem: perg.ordem,
            ativo: 1,
            created: new Date(),
            createdBy: 1,
          },
        });

        // 5. Criar respostas possíveis
        for (const resp of perg.respostas) {
          await tx.escalaPerguntaResposta.create({
            data: {
              resposta: resp.resposta.trim(),
              idPergunta: pergunta.id,
              valor: resp.valor,
              ativo: 1,
              created: new Date(),
              createdBy: 1,
            },
          });
        }
      }

      return escala;
    });

    return NextResponse.json(
      { success: true, escalaId: result.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[POST /api/escalas/builder] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro ao criar escala.' },
      { status: 500 }
    );
  }
}
