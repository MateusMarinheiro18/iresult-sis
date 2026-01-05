// src/app/api/escalas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth/jwt';

function getBrasiliaDate(): Date {
  const now = new Date();
  const utcMs = now.getTime();
  const brasiliaOffsetInMs = -3 * 3600000;
  return new Date(utcMs + brasiliaOffsetInMs);
}

function isPrismaUnknownArgError(err: any) {
  const m = String(err?.message ?? '').toLowerCase();
  return /unknown argument|unknown field|field does not exist/i.test(m);
}

async function attemptUpdate(delegate: any, where: any, dataCamel: any, dataSnake: any, dataPlain: any) {
  try {
    return await delegate.update({ where, data: dataCamel });
  } catch (err: any) {
    if (isPrismaUnknownArgError(err)) {
      try {
        return await delegate.update({ where, data: dataSnake });
      } catch (err2: any) {
        if (isPrismaUnknownArgError(err2)) {
          return await delegate.update({ where, data: dataPlain });
        }
        throw err2;
      }
    }
    throw err;
  }
}

async function attemptCreate(delegate: any, dataCamel: any, dataSnake: any, dataPlain: any, select?: any) {
  try {
    return await delegate.create({ data: dataCamel, ...(select ? { select } : {}) });
  } catch (err: any) {
    if (isPrismaUnknownArgError(err)) {
      try {
        return await delegate.create({ data: dataSnake, ...(select ? { select } : {}) });
      } catch (err2: any) {
        if (isPrismaUnknownArgError(err2)) {
          return await delegate.create({ data: dataPlain, ...(select ? { select } : {}) });
        }
        throw err2;
      }
    }
    throw err;
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });

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

    const now = getBrasiliaDate();

    await prisma.$transaction(async (tx) => {
      // 1) Atualiza campos básicos da escala
      const escalaUpdateBase: any = {
        nome,
        dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
        ativo: Number(ativo) === 1 ? 1 : 0,
      };

      await attemptUpdate(
        tx.escala,
        { id: escalaId },
        { ...escalaUpdateBase, updated: now, updatedBy: adminId },
        { ...escalaUpdateBase, updated: now, updated_by: adminId },
        escalaUpdateBase
      );

      // 2) Remover registros dependentes antigos
      // Primeiro: buscar IDs das perguntas existentes
      const perguntasExistentes = await tx.escalaPergunta.findMany({
        where: { idEscala: escalaId },
        select: { id: true },
      });
      const perguntaIds = perguntasExistentes.map((p) => p.id);

      if (perguntaIds.length > 0) {
        // ✅ NOVO: deletar relações pergunta-categoria
        try {
          await (tx as any).escalaPerguntaCategoria.deleteMany({
            where: { perguntaId: { in: perguntaIds } },
          });
        } catch (err) {
          // Tenta nomenclatura alternativa
          try {
            await (tx as any).escala_pergunta_categoria.deleteMany({
              where: { pergunta_id: { in: perguntaIds } },
            });
          } catch (err2) {
            // Ignora se a tabela não existir
            console.warn('Não foi possível deletar relações pergunta-categoria:', err2);
          }
        }

        // deletar respostas
        await tx.escalaPerguntaResposta.deleteMany({
          where: { idPergunta: { in: perguntaIds } },
        });
      }

      // deletar perguntas
      await tx.escalaPergunta.deleteMany({
        where: { idEscala: escalaId },
      });

      // deletar categorias (não há mais FK direta de pergunta para categoria)
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

      // deletar módulos
      await tx.escalaModulo.deleteMany({
        where: { idEscala: escalaId },
      });

      // 3) Recriar módulos
      const tempModuleIdToReal: Record<string, number> = {};
      for (const m of modulos) {
        if (!m.tempId) throw new Error('Modulo sem tempId');
        if (!m.nome || !String(m.nome).trim()) throw new Error('Módulo sem nome');

        const parseNullable = (v: any) =>
          v != null && String(v).trim() !== '' ? parseFloat(String(v).trim()) : null;

        const modBase: any = {
          idEscala: escalaId,
          nome: String(m.nome).trim(),
          valorInicialFavoravel: parseNullable(m.valorInicialFavoravel),
          valorFinalFavoravel: parseNullable(m.valorFinalFavoravel),
          valorInicialIntermediario: parseNullable(m.valorInicialIntermediario),
          valorFinalIntermediario: parseNullable(m.valorFinalIntermediario),
          valorInicialRisco: parseNullable(m.valorInicialRisco),
          valorFinalRisco: parseNullable(m.valorFinalRisco),
          ativo: 1,
        };

        const modulo = await attemptCreate(
          tx.escalaModulo,
          { ...modBase, created: now, createdBy: adminId },
          { ...modBase, created: now, created_by: adminId },
          modBase,
          { id: true }
        );
        tempModuleIdToReal[m.tempId] = modulo.id;
      }

      // 4) Recriar categorias
      const tempCategoriaIdToReal: Record<string, number> = {};
      for (const c of categorias) {
        if (!c.tempId) throw new Error('Categoria sem tempId');
        if (!c.nome || !String(c.nome).trim()) throw new Error('Categoria sem nome');

        const moduloIdReal = tempModuleIdToReal[c.moduloTempId];
        if (!moduloIdReal) throw new Error(`Módulo não encontrado para categoria ${c.nome}`);

        const catBase = {
          nome: String(c.nome).trim(),
          idModulo: moduloIdReal,
          ativo: 1,
        };

        const categoria = await attemptCreate(
          tx.escalaCategoria,
          { ...catBase, created: now, createdBy: adminId },
          { ...catBase, created: now, created_by: adminId },
          catBase,
          { id: true }
        );
        tempCategoriaIdToReal[c.tempId] = categoria.id;
      }

      // 5) Recriar perguntas, respostas e relações com categorias
      for (const p of perguntas) {
        if (!p.tempId) throw new Error('Pergunta sem tempId');
        if (!p.pergunta || !String(p.pergunta).trim()) throw new Error('Pergunta sem texto');

        const moduloIdReal = tempModuleIdToReal[p.moduloTempId];
        if (!moduloIdReal) {
          throw new Error(`Referência inválida em pergunta: ${p.pergunta}`);
        }

        // ✅ MUDOU: não precisa mais de idCategoria único
        const perguntaBase: any = {
          idEscala: escalaId,
          pergunta: String(p.pergunta).trim(),
          ordem: Number(p.ordem) || 0,
          idModulo: moduloIdReal,
          ativo: 1,
        };

        const perguntaCreated = await attemptCreate(
          tx.escalaPergunta,
          { ...perguntaBase, created: now, createdBy: adminId },
          { ...perguntaBase, created: now, created_by: adminId },
          perguntaBase,
          { id: true }
        );

        // ✅ NOVO: criar relações many-to-many com categorias
        if (p.categoriasTempIds && p.categoriasTempIds.length > 0) {
          for (let i = 0; i < p.categoriasTempIds.length; i++) {
            const catTempId = p.categoriasTempIds[i];
            const categoriaIdReal = tempCategoriaIdToReal[catTempId];
            
            if (!categoriaIdReal) {
              console.warn(`Categoria ${catTempId} não encontrada para pergunta ${p.pergunta}`);
              continue;
            }

            // Tenta diferentes nomenclaturas possíveis
            try {
              await (tx as any).escalaPerguntaCategoria.create({
                data: {
                  perguntaId: perguntaCreated.id,
                  categoriaId: categoriaIdReal,
                  ordem: i + 1,
                  created: now,
                },
              });
            } catch (err) {
              // Tenta nomenclatura alternativa
              try {
                await (tx as any).escala_pergunta_categoria.create({
                  data: {
                    pergunta_id: perguntaCreated.id,
                    categoria_id: categoriaIdReal,
                    ordem: i + 1,
                    created: now,
                  },
                });
              } catch (err2) {
                // Tenta outra variação
                await (tx as any).EscalaPerguntaCategoria.create({
                  data: {
                    idPergunta: perguntaCreated.id,
                    idCategoria: categoriaIdReal,
                    ordem: i + 1,
                  },
                });
              }
            }
          }
        }

        // respostas
        for (const r of p.respostas ?? []) {
          if (!r.resposta || !String(r.resposta).trim()) continue;
          const respBase = {
            idPergunta: perguntaCreated.id,
            resposta: String(r.resposta).trim(),
            valor: Number(r.valor) || 0,
            ativo: 1,
          };
          await attemptCreate(
            tx.escalaPerguntaResposta,
            { ...respBase, created: now, createdBy: adminId },
            { ...respBase, created: now, created_by: adminId },
            respBase
          );
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Erro ao atualizar escala:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao atualizar escala.' }, { status: 500 });
  }
}