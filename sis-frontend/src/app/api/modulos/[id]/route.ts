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

const parseNullable = (v: any) =>
  v != null && String(v).trim() !== '' ? parseFloat(String(v).trim().replace(',', '.')) : null;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });

    const { id: idStr } = await params;
    const moduloId = Number(idStr);
    if (!moduloId || Number.isNaN(moduloId) || moduloId <= 0) {
      return NextResponse.json({ error: 'ID do módulo inválido.' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });

    const {
      nome,
      valorInicialFavoravel,
      valorFinalFavoravel,
      valorInicialIntermediario,
      valorFinalIntermediario,
      valorInicialRisco,
      valorFinalRisco,
    } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Nome do módulo é obrigatório.' }, { status: 400 });
    }

    const now = getBrasiliaDate();

    const modBase: any = {
      nome: nome.trim(),
      valorInicialFavoravel: parseNullable(valorInicialFavoravel),
      valorFinalFavoravel: parseNullable(valorFinalFavoravel),
      valorInicialIntermediario: parseNullable(valorInicialIntermediario),
      valorFinalIntermediario: parseNullable(valorFinalIntermediario),
      valorInicialRisco: parseNullable(valorInicialRisco),
      valorFinalRisco: parseNullable(valorFinalRisco),
    };

    await attemptUpdate(
      prisma.escalaModulo,
      { id: moduloId },
      { ...modBase, updated: now, updatedBy: adminId },
      { ...modBase, updated: now, updated_by: adminId },
      modBase
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Erro ao atualizar módulo:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao atualizar módulo.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok } = verifyAdminToken(token);
    if (!ok) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const { id: idStr } = await params;
    const moduloId = Number(idStr);
    if (!moduloId || Number.isNaN(moduloId) || moduloId <= 0) {
      return NextResponse.json({ error: 'ID do módulo inválido.' }, { status: 400 });
    }

    const hasPerguntas = await prisma.escalaPergunta.findFirst({
      where: { idModulo: moduloId, ativo: 1 },
    });

    if (hasPerguntas) {
      return NextResponse.json(
        { error: 'Não é possível excluir um módulo que possui perguntas vinculadas.' },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.escalaCategoria.deleteMany({ where: { idModulo: moduloId } });
      await tx.escalaModulo.delete({ where: { id: moduloId } });
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Erro ao excluir módulo:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao excluir módulo.' }, { status: 500 });
  }
}
