// src/app/api/admins/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * API: /api/admins
 * - GET: lista administradores (q, page, perPage)
 * - POST: cria administrador (recebe senha em plain text; hash com bcrypt)
 *
 * Nota: ajuste a checagem de autorização conforme sua implementação de auth.
 */

// stub de autorização — substitua pela sua lógica real
async function checkIsSuperAdminOrSession(req: NextRequest) {
  // TODO: integrar com sessão/JWT/etc.
  return true;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET(request: NextRequest) {
  try {
    // autorização básica (stub)
    const allowed = await checkIsSuperAdminOrSession(request);
    if (!allowed) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim();
    const page = parseInt(url.searchParams.get('page') ?? '1', 10) || 1;
    const perPage = Math.min(parseInt(url.searchParams.get('perPage') ?? '10', 10) || 10, 100);

    const where: any = {};
    if (q) {
      where.OR = [
        { nome: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.administrador.count({ where });

    const admins = await prisma.administrador.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        nome: true,
        email: true,
        // não retornar senhaHash
      },
    });

    return NextResponse.json({ data: admins, meta: { total, page, perPage } });
  } catch (err) {
    console.error('GET /api/admins error', err);
    return NextResponse.json({ error: 'Erro interno ao listar administradores.' }, { status: 500 });
  }
}

type CreateBody = {
  nome?: string;
  email?: string;
  senha?: string;
  ativo?: number | boolean | null; // se futuramente houver campo ativo
  created_by?: number | null;
};

export async function POST(request: NextRequest) {
  try {
    // autorização básica (stub)
    const allowed = await checkIsSuperAdminOrSession(request);
    if (!allowed) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = (await request.json()) as CreateBody;

    const nome = String(body.nome ?? '').trim();
    const email = String(body.email ?? '').trim();
    const senha = typeof body.senha === 'string' ? body.senha : '';

    // validações
    if (!nome || nome.length < 2) {
      return NextResponse.json({ error: 'Nome é obrigatório (mínimo 2 caracteres).' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }
    if (!senha || senha.length < 6) {
      return NextResponse.json({ error: 'Senha é obrigatória (mínimo 6 caracteres).' }, { status: 400 });
    }

    // verifica duplicidade de email
    const exists = await prisma.administrador.findFirst({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: 'Email já cadastrado.' }, { status: 409 });
    }

    // hash da senha com bcrypt
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const senhaHash = await bcrypt.hash(senha, salt);

    // cria administrador (ajuste campos se precisar adicionar created/ativo no modelo)
    const newAdmin = await prisma.administrador.create({
      data: {
        nome,
        email,
        senhaHash,
        // se tiver fields opcionais como 'ativo' ou 'created', adicione aqui
      } as any,
      select: {
        id: true,
        nome: true,
        email: true,
      },
    });

    return NextResponse.json({ data: newAdmin }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admins error', err);
    return NextResponse.json({ error: 'Erro interno ao criar administrador.' }, { status: 500 });
  }
}
