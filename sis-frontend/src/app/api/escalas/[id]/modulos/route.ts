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

const parseNullable = (v: any) =>
  v != null && String(v).trim() !== '' ? parseFloat(String(v).trim().replace(',', '.')) : null;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      idEscala: escalaId,
      valorInicialFavoravel: parseNullable(valorInicialFavoravel),
      valorFinalFavoravel: parseNullable(valorFinalFavoravel),
      valorInicialIntermediario: parseNullable(valorInicialIntermediario),
      valorFinalIntermediario: parseNullable(valorFinalIntermediario),
      valorInicialRisco: parseNullable(valorInicialRisco),
      valorFinalRisco: parseNullable(valorFinalRisco),
      ativo: 1,
    };

    const modulo = await attemptCreate(
      prisma.escalaModulo,
      { ...modBase, created: now, createdBy: adminId },
      { ...modBase, created: now, created_by: adminId },
      modBase,
      { 
        id: true, 
        nome: true,
        valorInicialFavoravel: true,
        valorFinalFavoravel: true,
        valorInicialIntermediario: true,
        valorFinalIntermediario: true,
        valorInicialRisco: true,
        valorFinalRisco: true,
      }
    );

    return NextResponse.json({ 
      id: modulo.id, 
      nome: modulo.nome,
      valorInicialFavoravel: modulo.valorInicialFavoravel?.toString() ?? '',
      valorFinalFavoravel: modulo.valorFinalFavoravel?.toString() ?? '',
      valorInicialIntermediario: modulo.valorInicialIntermediario?.toString() ?? '',
      valorFinalIntermediario: modulo.valorFinalIntermediario?.toString() ?? '',
      valorInicialRisco: modulo.valorInicialRisco?.toString() ?? '',
      valorFinalRisco: modulo.valorFinalRisco?.toString() ?? '',
    }, { status: 201 });
  } catch (err: any) {
    console.error('Erro ao criar módulo:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao criar módulo.' }, { status: 500 });
  }
}
