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
    const escalaId = Number(idStr);
    if (!escalaId || Number.isNaN(escalaId) || escalaId <= 0) {
      return NextResponse.json({ error: 'ID da escala inválido.' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });

    const { perguntas } = body;

    if (!Array.isArray(perguntas)) {
      return NextResponse.json({ error: 'Formato inválido.' }, { status: 400 });
    }

    const now = getBrasiliaDate();

    await prisma.$transaction(async (tx) => {
      for (const p of perguntas) {
        const ordemBase: any = { ordem: Number(p.ordem) || 0 };
        await attemptUpdate(
          tx.escalaPergunta,
          { id: Number(p.id) },
          { ...ordemBase, updated: now, updatedBy: adminId },
          { ...ordemBase, updated: now, updated_by: adminId },
          ordemBase
        );
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Erro ao ordenar perguntas:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao ordenar perguntas.' }, { status: 500 });
  }
}
