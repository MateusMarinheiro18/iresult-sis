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

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { nome } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Nome da categoria é obrigatório.' }, { status: 400 });
    }

    const now = getBrasiliaDate();

    const catBase: any = {
      nome: nome.trim(),
      idModulo: moduloId,
      ativo: 1,
    };

    const categoria = await attemptCreate(
      prisma.escalaCategoria,
      { ...catBase, created: now, createdBy: adminId },
      { ...catBase, created: now, created_by: adminId },
      catBase,
      { id: true, nome: true, idModulo: true }
    );

    return NextResponse.json({ id: categoria.id, nome: categoria.nome, moduloId: categoria.idModulo }, { status: 201 });
  } catch (err: any) {
    console.error('Erro ao criar categoria:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao criar categoria.' }, { status: 500 });
  }
}
