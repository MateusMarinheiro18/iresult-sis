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
    const perguntaId = Number(idStr);
    if (!perguntaId || Number.isNaN(perguntaId) || perguntaId <= 0) {
      return NextResponse.json({ error: 'ID da pergunta inválido.' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });

    const { pergunta, moduloId, categoriasIds, respostas, ordem } = body;

    if (!pergunta?.trim()) {
      return NextResponse.json({ error: 'Texto da pergunta é obrigatório.' }, { status: 400 });
    }

    if (!moduloId || Number.isNaN(Number(moduloId))) {
      return NextResponse.json({ error: 'Módulo é obrigatório.' }, { status: 400 });
    }

    if (!Array.isArray(categoriasIds) || categoriasIds.length === 0) {
      return NextResponse.json({ error: 'A pergunta deve ter pelo menos uma categoria.' }, { status: 400 });
    }

    const now = getBrasiliaDate();

    await prisma.$transaction(async (tx) => {
      const perguntaBase: any = {
        pergunta: pergunta.trim(),
        idModulo: Number(moduloId),
        ordem: Number(ordem) || 0,
      };

      await attemptUpdate(
        tx.escalaPergunta,
        { id: perguntaId },
        { ...perguntaBase, updated: now, updatedBy: adminId },
        { ...perguntaBase, updated: now, updated_by: adminId },
        perguntaBase
      );

      await tx.escalaPerguntaHasCategoria.deleteMany({
        where: { idPergunta: perguntaId },
      });

      if (categoriasIds.length > 0) {
        await tx.escalaPerguntaHasCategoria.createMany({
          data: categoriasIds.map((catId: number) => ({
            idPergunta: perguntaId,
            idCategoria: Number(catId),
          })),
        });
      }

      const incomingRespostaIds: number[] = [];

      for (const r of respostas ?? []) {
        if (!r.resposta?.trim()) continue;
        const respBase: any = {
          idPergunta: perguntaId,
          resposta: r.resposta.trim(),
          valor: Number(r.valor) || 0,
          ativo: 1,
        };

        let savedResposta;
        if (r.id) {
          // Atualiza resposta existente
          savedResposta = await attemptUpdate(
            tx.escalaPerguntaResposta,
            { id: r.id },
            { ...respBase, updated: now, updatedBy: adminId },
            { ...respBase, updated: now, updated_by: adminId },
            respBase
          );
          incomingRespostaIds.push(r.id);
        } else {
          // Cria nova resposta
          savedResposta = await attemptCreate(
            tx.escalaPerguntaResposta,
            { ...respBase, created: now, createdBy: adminId },
            { ...respBase, created: now, created_by: adminId },
            respBase
          );
          incomingRespostaIds.push(savedResposta.id);
        }
      }

      // Desativa respostas que não vieram no payload
      await tx.escalaPerguntaResposta.updateMany({
        where: {
          idPergunta: perguntaId,
          id: { notIn: incomingRespostaIds },
        },
        data: {
          ativo: 0,
          updated: now,
          updatedBy: adminId,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Erro ao atualizar pergunta:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao atualizar pergunta.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok } = verifyAdminToken(token);
    if (!ok) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const { id: idStr } = await params;
    const perguntaId = Number(idStr);
    if (!perguntaId || Number.isNaN(perguntaId) || perguntaId <= 0) {
      return NextResponse.json({ error: 'ID da pergunta inválido.' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.escalaPerguntaResposta.deleteMany({ where: { idPergunta: perguntaId } });
      await (tx as any).escalaPerguntaHasCategoria.deleteMany({ where: { idPergunta: perguntaId } });
      await tx.escalaPergunta.delete({ where: { id: perguntaId } });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Erro ao excluir pergunta:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao excluir pergunta.' }, { status: 500 });
  }
}
