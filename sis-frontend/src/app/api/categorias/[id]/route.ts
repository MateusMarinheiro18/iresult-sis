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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });

    const { id: idStr } = await params;
    const categoriaId = Number(idStr);
    if (!categoriaId || Number.isNaN(categoriaId) || categoriaId <= 0) {
      return NextResponse.json({ error: 'ID da categoria inválido.' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });

    const { nome } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Nome da categoria é obrigatório.' }, { status: 400 });
    }

    const now = getBrasiliaDate();

    const catBase: any = {
      nome: nome.trim(),
    };

    await attemptUpdate(
      prisma.escalaCategoria,
      { id: categoriaId },
      { ...catBase, updated: now, updatedBy: adminId },
      { ...catBase, updated: now, updated_by: adminId },
      catBase
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Erro ao atualizar categoria:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao atualizar categoria.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok } = verifyAdminToken(token);
    if (!ok) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const { id: idStr } = await params;
    const categoriaId = Number(idStr);
    if (!categoriaId || Number.isNaN(categoriaId) || categoriaId <= 0) {
      return NextResponse.json({ error: 'ID da categoria inválido.' }, { status: 400 });
    }

    const hasPerguntas = await (prisma as any).escalaPerguntaHasCategoria.findFirst({
      where: { idCategoria: categoriaId },
    });

    if (hasPerguntas) {
      return NextResponse.json(
        { error: 'Não é possível excluir uma categoria vinculada a perguntas.' },
        { status: 409 }
      );
    }

    await prisma.escalaCategoria.delete({ where: { id: categoriaId } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Erro ao excluir categoria:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao excluir categoria.' }, { status: 500 });
  }
}
