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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const { id: idStr } = await params;
    const escalaId = idStr ? Number(idStr) : NaN;
    if (!escalaId || Number.isNaN(escalaId) || escalaId <= 0) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    // Buscar escala com todas as relações (ajustado para many-to-many pergunta<->categoria)
    const escala = await prisma.escala.findUnique({
      where: { id: escalaId },
      include: {
        modulos: {
          where: { ativo: 1 },
          include: {
            categorias: {
              where: { ativo: 1 },
            },
          },
          orderBy: { id: 'asc' },
        },
        perguntas: {
          where: { ativo: 1 },
          include: {
            // join table com categoria
            categoriasRel: {
              include: {
                categoria: true,
              },
            },
            respostasPossiveis: {
              where: { ativo: 1 },
              orderBy: { id: 'asc' },
            },
          },
          orderBy: { ordem: 'asc' },
        },
      },
    });

    if (!escala) {
      return NextResponse.json({ error: 'Escala não encontrada.' }, { status: 404 });
    }

    const modulos = escala.modulos.map((m) => ({
      tempId: `mod-${m.id}`,
      id: m.id,
      nome: m.nome,
      valorInicialFavoravel: m.valorInicialFavoravel?.toString() ?? null,
      valorFinalFavoravel: m.valorFinalFavoravel?.toString() ?? null,
      valorInicialIntermediario: m.valorInicialIntermediario?.toString() ?? null,
      valorFinalIntermediario: m.valorFinalIntermediario?.toString() ?? null,
      valorInicialRisco: m.valorInicialRisco?.toString() ?? null,
      valorFinalRisco: m.valorFinalRisco?.toString() ?? null,
    }));

    const categorias = escala.modulos.flatMap((m) =>
      m.categorias.map((c) => ({
        tempId: `cat-${c.id}`,
        id: c.id,
        nome: c.nome,
        moduloTempId: `mod-${m.id}`,
      }))
    );

    const perguntas = escala.perguntas.map((p) => {
      // extrai categorias via join table (categoriasRel -> categoria)
      const categoriasTempIds = (p as any).categoriasRel && Array.isArray((p as any).categoriasRel)
        ? (p as any).categoriasRel
            .map((cr: any) => cr?.categoria ? `cat-${cr.categoria.id}` : null)
            .filter(Boolean)
        : [];

      return {
        tempId: `perg-${p.id}`,
        id: p.id,
        pergunta: p.pergunta,
        ordem: p.ordem ?? 0,
        moduloTempId: `mod-${p.idModulo}`,
        categoriasTempIds,
        respostas: (p.respostasPossiveis || []).map((r) => ({
          tempId: `resp-${r.id}`,
          id: r.id,
          resposta: r.resposta,
          valor: r.valor ?? 0,
        })),
      };
    });

    return NextResponse.json({
      id: escala.id,
      nome: escala.nome,
      dataVencimento: escala.dataVencimento?.toISOString() ?? null,
      ativo: escala.ativo ?? 1,
      modulos,
      categorias,
      perguntas,
    });
  } catch (err: any) {
    console.error('Erro ao buscar escala:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao buscar escala.' }, { status: 500 });
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

    // TRANSAÇÃO: upsert inteligente (preserva ids quando enviados, cria novos quando necessário,
    // e remove apenas o que foi removido no payload)
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

      // BUSCAS ATUAIS (ajudam a decidir o que deletar)
      const modulosExistentes = await tx.escalaModulo.findMany({
        where: { idEscala: escalaId },
        select: { id: true },
      });
      const categoriasExistentes = await tx.escalaCategoria.findMany({
        where: { idModulo: { in: modulosExistentes.map(m => m.id) } },
        select: { id: true, idModulo: true },
      });
      const perguntasExistentes = await tx.escalaPergunta.findMany({
        where: { idEscala: escalaId },
        select: { id: true },
      });

      // Maps temporários -> reais para relacionamento
      const tempModuleIdToReal: Record<string, number> = {};
      const tempCategoriaIdToReal: Record<string, number> = {};
      const tempPerguntaIdToReal: Record<string, number> = {};

      const keepModuleIds: number[] = [];
      const keepCategoriaIds: number[] = [];
      const keepPerguntaIds: number[] = [];

      // helper para parse nullable decimal (aceita vírgula)
      const parseNullable = (v: any) =>
        v != null && String(v).trim() !== '' ? parseFloat(String(v).trim().replace(',', '.')) : null;

      // 2) Upsert módulos (preservando ids existentes quando fornecidos)
      for (const m of modulos) {
        if (!m.tempId) throw new Error('Modulo sem tempId');
        if (!m.nome || !String(m.nome).trim()) throw new Error('Módulo sem nome');

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

        if (m.id && Number(m.id) > 0) {
          // atualizar existente
          const realId = Number(m.id);
          await attemptUpdate(
            tx.escalaModulo,
            { id: realId },
            { ...modBase, updated: now, updatedBy: adminId },
            { ...modBase, updated: now, updated_by: adminId },
            modBase
          );
          tempModuleIdToReal[m.tempId] = realId;
          keepModuleIds.push(realId);
        } else {
          // criar novo
          const modulo = await attemptCreate(
            tx.escalaModulo,
            { ...modBase, created: now, createdBy: adminId },
            { ...modBase, created: now, created_by: adminId },
            modBase,
            { id: true }
          );
          tempModuleIdToReal[m.tempId] = modulo.id;
          keepModuleIds.push(modulo.id);
        }
      }

      // 3) Upsert categorias (preservando ids existentes quando fornecidos)
      for (const c of categorias) {
        if (!c.tempId) throw new Error('Categoria sem tempId');
        if (!c.nome || !String(c.nome).trim()) throw new Error('Categoria sem nome');

        const moduloIdReal = tempModuleIdToReal[c.moduloTempId];
        if (!moduloIdReal) throw new Error(`Módulo não encontrado para categoria ${c.nome}`);

        const catBase: any = {
          nome: String(c.nome).trim(),
          idModulo: moduloIdReal,
          ativo: 1,
        };

        if (c.id && Number(c.id) > 0) {
          const realCatId = Number(c.id);
          await attemptUpdate(
            tx.escalaCategoria,
            { id: realCatId },
            { ...catBase, updated: now, updatedBy: adminId },
            { ...catBase, updated: now, updated_by: adminId },
            catBase
          );
          tempCategoriaIdToReal[c.tempId] = realCatId;
          keepCategoriaIds.push(realCatId);
        } else {
          const categoriaCreated = await attemptCreate(
            tx.escalaCategoria,
            { ...catBase, created: now, createdBy: adminId },
            { ...catBase, created: now, created_by: adminId },
            catBase,
            { id: true }
          );
          tempCategoriaIdToReal[c.tempId] = categoriaCreated.id;
          keepCategoriaIds.push(categoriaCreated.id);
        }
      }

      // 4) Upsert perguntas + relações many-to-many + respostas
      for (const p of perguntas) {
        if (!p.tempId) throw new Error('Pergunta sem tempId');
        if (!p.pergunta || !String(p.pergunta).trim()) throw new Error('Pergunta sem texto');

        const moduloIdReal = tempModuleIdToReal[p.moduloTempId];
        if (!moduloIdReal) {
          throw new Error(`Referência inválida em pergunta: ${p.pergunta}`);
        }

        const perguntaBase: any = {
          idEscala: escalaId,
          pergunta: String(p.pergunta).trim(),
          ordem: Number(p.ordem) || 0,
          idModulo: moduloIdReal,
          ativo: 1,
        };

        let perguntaCreated: any = null;

        if (p.id && Number(p.id) > 0) {
          // atualizar pergunta existente
          const realPergId = Number(p.id);
          await attemptUpdate(
            tx.escalaPergunta,
            { id: realPergId },
            { ...perguntaBase, updated: now, updatedBy: adminId },
            { ...perguntaBase, updated: now, updated_by: adminId },
            perguntaBase
          );
          perguntaCreated = { id: realPergId };
          tempPerguntaIdToReal[p.tempId] = realPergId;
          keepPerguntaIds.push(realPergId);
        } else {
          // criar pergunta
          perguntaCreated = await attemptCreate(
            tx.escalaPergunta,
            { ...perguntaBase, created: now, createdBy: adminId },
            { ...perguntaBase, created: now, created_by: adminId },
            perguntaBase,
            { id: true }
          );
          tempPerguntaIdToReal[p.tempId] = perguntaCreated.id;
          keepPerguntaIds.push(perguntaCreated.id);
        }

        // 4.a) atualizar relações many-to-many: remover as antigas para esta pergunta e criar as novas
        await (tx as any).escalaPerguntaHasCategoria.deleteMany({
          where: { idPergunta: perguntaCreated.id },
        });

        if (p.categoriasTempIds && p.categoriasTempIds.length > 0) {
          for (const catTempId of p.categoriasTempIds) {
            const categoriaIdReal = tempCategoriaIdToReal[catTempId];
            if (!categoriaIdReal) {
              console.warn(`Categoria ${catTempId} não encontrada para pergunta ${p.pergunta}`);
              continue;
            }

            await (tx as any).escalaPerguntaHasCategoria.create({
              data: {
                pergunta: { connect: { id: perguntaCreated.id } },
                categoria: { connect: { id: categoriaIdReal } },
              },
            });
          }
        }

        // 4.b) respostas: deletar as antigas e inserir as novas (se quiser preservar ids de respostas, adaptar aqui)
        await tx.escalaPerguntaResposta.deleteMany({
          where: { idPergunta: perguntaCreated.id },
        });

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

      // 5) Remover registros que NÃO foram mantidos no payload (modules/categories/perguntas)
      // módulos removidos
      if (modulosExistentes.length > 0) {
        const modulesToRemove = modulosExistentes.map(m => m.id).filter(id => !keepModuleIds.includes(id));
        if (modulesToRemove.length > 0) {
          // deletar categorias e perguntas relacionadas a esses módulos (cascata manual para garantir limpeza)
          const categoriasToRemove = await tx.escalaCategoria.findMany({ where: { idModulo: { in: modulesToRemove } }, select: { id: true } });
          const catIdsToRemove = categoriasToRemove.map(c => c.id);

          if (catIdsToRemove.length > 0) {
            // apagar links pergunta<->categoria para categorias removidas
            await (tx as any).escalaPerguntaHasCategoria.deleteMany({ where: { idCategoria: { in: catIdsToRemove } } });
            // apagar as próprias categorias
            await tx.escalaCategoria.deleteMany({ where: { id: { in: catIdsToRemove } } });
          }

          // apagar módulos
          await tx.escalaModulo.deleteMany({ where: { id: { in: modulesToRemove } } });
        }
      }

      // categorias removidas (dentro de módulos mantidos)
      const allCategoriaIdsExisting = categoriasExistentes.map(c => c.id);
      const categoriasToDelete = allCategoriaIdsExisting.filter(id => !keepCategoriaIds.includes(id));
      if (categoriasToDelete.length > 0) {
        // apagar relações pergunta<->categoria
        await (tx as any).escalaPerguntaHasCategoria.deleteMany({ where: { idCategoria: { in: categoriasToDelete } } });
        // apagar categorias
        await tx.escalaCategoria.deleteMany({ where: { id: { in: categoriasToDelete } } });
      }

      // perguntas removidas
      const perguntaIdsExisting = perguntasExistentes.map(p => p.id);
      const perguntasToRemove = perguntaIdsExisting.filter(id => !keepPerguntaIds.includes(id));
      if (perguntasToRemove.length > 0) {
        // apagar respostas
        await tx.escalaPerguntaResposta.deleteMany({ where: { idPergunta: { in: perguntasToRemove } } });
        // apagar relacionamentos pergunta-categoria
        await (tx as any).escalaPerguntaHasCategoria.deleteMany({ where: { idPergunta: { in: perguntasToRemove } } });
        // apagar perguntas
        await tx.escalaPergunta.deleteMany({ where: { id: { in: perguntasToRemove } } });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Erro ao atualizar escala:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao atualizar escala.' }, { status: 500 });
  }
}
