// src/app/api/escalas/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const escalaId = idStr ? Number(idStr) : NaN;
  if (!escalaId || Number.isNaN(escalaId) || escalaId <= 0) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });

  const {
    nome,
    dataVencimento,
    ativo,
    modulos = [],
    categorias = [],
    perguntas = [],
  } = body;

  try {
    await prisma.$transaction(async (tx) => {
      // 1) Atualiza campos básicos da escala
      await tx.escala.update({
        where: { id: escalaId },
        data: {
          nome,
          dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
          ativo: Number(ativo) === 1 ? 1 : 0,
        },
      });

      // 2) Remover registros dependentes antigos
      // Primeiro: respostas (depende de perguntas)
      const perguntasExistentes = await tx.escalaPergunta.findMany({
        where: { idEscala: escalaId },
        select: { id: true },
      });
      const perguntaIds = perguntasExistentes.map((p) => p.id);
      
      if (perguntaIds.length > 0) {
        await tx.escalaPerguntaResposta.deleteMany({
          where: { idPergunta: { in: perguntaIds } },
        });
      }

      // Segundo: perguntas
      await tx.escalaPergunta.deleteMany({
        where: { idEscala: escalaId },
      });

      // Terceiro: categorias (depende de módulos)
      const modulosExistentes = await tx.escalaModulo.findMany({
        where: { idEscala: escalaId },
        select: { id: true },
      });
      const moduloIds = modulosExistentes.map((m) => m.id);
      
      if (moduloIds.length > 0) {
        await tx.escalaCategoria.deleteMany({
          where: { idModulo: { in: moduloIds } },
        });
      }

      // Quarto: módulos
      await tx.escalaModulo.deleteMany({
        where: { idEscala: escalaId },
      });

      // 3) Recriar módulos
      const tempModuleIdToReal: Record<string, number> = {};
      for (const m of modulos) {
        const created = await tx.escalaModulo.create({
          data: {
            idEscala: escalaId,
            nome: m.nome,
            valorInicialFavoravel: m.valorInicialFavoravel ? parseFloat(m.valorInicialFavoravel) : null,
            valorFinalFavoravel: m.valorFinalFavoravel ? parseFloat(m.valorFinalFavoravel) : null,
            valorInicialIntermediario: m.valorInicialIntermediario ? parseFloat(m.valorInicialIntermediario) : null,
            valorFinalIntermediario: m.valorFinalIntermediario ? parseFloat(m.valorFinalIntermediario) : null,
            valorInicialRisco: m.valorInicialRisco ? parseFloat(m.valorInicialRisco) : null,
            valorFinalRisco: m.valorFinalRisco ? parseFloat(m.valorFinalRisco) : null,
            ativo: 1,
            created: new Date(),
            createdBy: 1,
          },
        });
        tempModuleIdToReal[m.tempId] = created.id;
      }

      // 4) Recriar categorias
      const tempCategoriaIdToReal: Record<string, number> = {};
      for (const c of categorias) {
        const moduloIdReal = tempModuleIdToReal[c.moduloTempId];
        if (!moduloIdReal) continue;

        const created = await tx.escalaCategoria.create({
          data: {
            nome: c.nome,
            idModulo: moduloIdReal,
            ativo: 1,
            created: new Date(),
            createdBy: 1,
          },
        });
        tempCategoriaIdToReal[c.tempId] = created.id;
      }

      // 5) Recriar perguntas e respostas
      for (const p of perguntas) {
        const moduloIdReal = tempModuleIdToReal[p.moduloTempId];
        const categoriaIdReal = tempCategoriaIdToReal[p.categoriaTempId];

        if (!moduloIdReal || !categoriaIdReal) continue;

        const createdPerg = await tx.escalaPergunta.create({
          data: {
            idEscala: escalaId,
            pergunta: p.pergunta,
            ordem: p.ordem ?? 0,
            idModulo: moduloIdReal,
            idCategoria: categoriaIdReal,
            ativo: 1,
            created: new Date(),
            createdBy: 1,
          },
        });

        // Criar respostas
        for (const r of p.respostas) {
          await tx.escalaPerguntaResposta.create({
            data: {
              idPergunta: createdPerg.id,
              resposta: r.resposta,
              valor: Number(r.valor),
              ativo: 1,
              created: new Date(),
              createdBy: 1,
            },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro ao atualizar escala:', err);
    return NextResponse.json({ error: 'Erro ao atualizar escala.' }, { status: 500 });
  }
}
