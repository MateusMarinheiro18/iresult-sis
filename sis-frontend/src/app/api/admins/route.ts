// src/app/api/admins/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendAdminAccessEmail } from '@/lib/email/sendAdminAccessEmail'; // wrapper (veja arquivo sugerido)

function isValidEmail(email: string) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateRandomPassword(length = 12) {
  return crypto
    .randomBytes(Math.ceil(length * 0.75))
    .toString('base64')
    .replace(/\+/g, 'A')
    .replace(/\//g, 'B')
    .slice(0, length);
}

// stub de autorização — substitua pela sua lógica real
async function checkAdminAuth(req: NextRequest) {
  // Ex.: verificar sessão, token, claims, etc.
  return true;
}

type CreateBody = {
  nome?: string;
  email?: string;
};

export async function POST(request: NextRequest) {
  try {
    // autorização
    const allowed = await checkAdminAuth(request);
    if (!allowed) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const body = (await request.json().catch(() => ({}))) as CreateBody;
    const nome = String(body?.nome ?? '').trim();
    const email = String(body?.email ?? '').trim().toLowerCase();

    if (!nome || nome.length < 2) {
      return NextResponse.json({ error: 'Nome é obrigatório (mínimo 2 caracteres).' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    // checa existência (usando findFirst porque email não é unique no schema)
    const exists = await prisma.administrador.findFirst({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: 'Email já cadastrado para administrador.' }, { status: 409 });
    }

    // gera senha aleatória (texto puro)
    const plainPassword = generateRandomPassword(12);

    // hash com bcrypt
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const senhaHash = await bcrypt.hash(plainPassword, salt);

    // cria administrador
    const created = await prisma.administrador.create({
      data: {
        nome,
        email,
        senhaHash,
      },
      select: {
        id: true,
        nome: true,
        email: true,
      },
    });

    // envia e-mail com senha gerada (fire-and-forget)
    try {
      await sendAdminAccessEmail({
        to: created.email,
        name: created.nome,
        plainPassword,
      });
    } catch (sendErr) {
      console.error('Erro ao enviar e-mail de acesso ao admin:', sendErr);
      // não aborta criação: log apenas
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admins error', err);
    return NextResponse.json({ error: 'Erro interno ao criar administrador.' }, { status: 500 });
  }
}
