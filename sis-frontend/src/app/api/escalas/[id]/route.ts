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

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const { id: idStr } = await params;
    const escalaId = Number(idStr);
    if (!escalaId || Number.isNaN(escalaId) || escalaId <= 0) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

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
      id: m.id,
      tempId: `mod-${m.id}`,
      nome: m.nome,
      valorInicialFavoravel: m.valorInicialFavoravel?.toString() ?? '',
      valorFinalFavoravel: m.valorFinalFavoravel?.toString() ?? '',
      valorInicialIntermediario: m.valorInicialIntermediario?.toString() ?? '',
      valorFinalIntermediario: m.valorFinalIntermediario?.toString() ?? '',
      valorInicialRisco: m.valorInicialRisco?.toString() ?? '',
      valorFinalRisco: m.valorFinalRisco?.toString() ?? '',
    }));

    const categorias = escala.modulos.flatMap((m) =>
      m.categorias.map((c) => ({
        id: c.id,
        tempId: `cat-${c.id}`,
        nome: c.nome,
        moduloId: m.id,
        moduloTempId: `mod-${m.id}`,
      }))
    );

    const perguntas = escala.perguntas.map((p) => {
      const categoriasIds = (p as any).categoriasRel && Array.isArray((p as any).categoriasRel)
        ? (p as any).categoriasRel.map((cr: any) => cr?.categoria?.id).filter(Boolean)
        : [];

      const categoriasTempIds = categoriasIds.map((id: number) => `cat-${id}`);

      return {
        id: p.id,
        tempId: `perg-${p.id}`,
        pergunta: p.pergunta,
        ordem: p.ordem ?? 0,
        moduloId: p.idModulo,
        moduloTempId: `mod-${p.idModulo}`,
        categoriasIds,
        categoriasTempIds,
        respostas: (p.respostasPossiveis || []).map((r) => ({
          id: r.id,
          tempId: `resp-${r.id}`,
          resposta: r.resposta,
          valor: r.valor ?? 0,
        })),
      };
    });

    return NextResponse.json({
      id: escala.id,
      nome: escala.nome,
      dataVencimento: escala.dataVencimento ? escala.dataVencimento.toISOString().split('T')[0] : '',
      ativo: escala.ativo === 1,
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
    const escalaId = Number(idStr);
    if (!escalaId || Number.isNaN(escalaId) || escalaId <= 0) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });

    const { nome, dataVencimento, ativo } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Nome da escala é obrigatório.' }, { status: 400 });
    }

    const now = getBrasiliaDate();

    const escalaUpdateBase: any = {
      nome: nome.trim(),
      dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
      ativo: ativo ? 1 : 0,
    };

    await attemptUpdate(
      prisma.escala,
      { id: escalaId },
      { ...escalaUpdateBase, updated: now, updatedBy: adminId },
      { ...escalaUpdateBase, updated: now, updated_by: adminId },
      escalaUpdateBase
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Erro ao atualizar escala:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao atualizar escala.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });

    const { id: idStr } = await params;
    const escalaId = Number(idStr);
    if (!escalaId || Number.isNaN(escalaId) || escalaId <= 0) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const escala = await prisma.escala.findUnique({ where: { id: escalaId }, select: { id: true } });
    if (!escala) {
      return NextResponse.json({ error: 'Escala não encontrada.' }, { status: 404 });
    }

    const now = getBrasiliaDate();
    const softDeleteData = { ativo: 0, deleted: now, updated: now, deletedBy: adminId, updatedBy: adminId };

    await prisma.$transaction(async (tx) => {
      const modulos = await tx.escalaModulo.findMany({ where: { idEscala: escalaId }, select: { id: true } });
      const moduloIds = modulos.map((m) => m.id);

      if (moduloIds.length > 0) {
        const perguntas = await tx.escalaPergunta.findMany({ where: { idModulo: { in: moduloIds } }, select: { id: true } });
        const perguntaIds = perguntas.map((p) => p.id);

        if (perguntaIds.length > 0) {
          // Soft delete Respostas Possíveis
          await tx.escalaPerguntaResposta.updateMany({ where: { idPergunta: { in: perguntaIds } }, data: softDeleteData });
        }

        // Soft delete Perguntas
        await tx.escalaPergunta.updateMany({ where: { id: { in: perguntaIds } }, data: softDeleteData });

        // Soft delete Categorias
        await tx.escalaCategoria.updateMany({ where: { idModulo: { in: moduloIds } }, data: softDeleteData });
      }

      // Soft delete Módulos
      await tx.escalaModulo.updateMany({ where: { idEscala: escalaId }, data: softDeleteData });

      // Soft delete Escala
      await tx.escala.update({ where: { id: escalaId }, data: softDeleteData });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Erro ao excluir escala:', err);
    // Trata erro de chave estrangeira, caso a escala esteja em uso
    if (err?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Não é possível excluir a escala pois ela está sendo utilizada.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: err?.message || 'Erro ao excluir escala.' }, { status: 500 });
  }
}
