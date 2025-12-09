// src/app/api/admins/forgot/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { sendAdminPasswordResetEmail } from '@/lib/email/sendAdminPasswordResetEmail'; // implemente abaixo

const SECRET = process.env.PASSWORD_RESET_JWT_SECRET || '';
const EXPIRES_SECONDS = Number(process.env.PASSWORD_RESET_TOKEN_EXPIRES_SECONDS ?? '7200'); // 2h por padrão
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? '').trim().toLowerCase();

    if (!email || !isValidEmail(email)) {
      // Resposta genérica — não vaza existência do email
      return NextResponse.json({ ok: true });
    }

    // busca admin pelo email — assumimos que o e-mail é único
    const admin = await prisma.administrador.findFirst({
      where: { email },
      select: { id: true, nome: true, email: true },
    });

    if (!admin) {
      // resposta genérica mesmo se não existir
      return NextResponse.json({ ok: true });
    }

    if (!SECRET) {
      console.error('PASSWORD_RESET_JWT_SECRET não configurado!');
      return NextResponse.json({ ok: true }); // não vaza
    }

    // Gera JWT curto
    const token = jwt.sign(
      {
        sub: String(admin.id),
      },
      SECRET,
      { algorithm: 'HS256', expiresIn: EXPIRES_SECONDS }
    );

    // Monta link (não colocar id no query — token carrega sub)
    const resetLink = `${APP_URL}/client/reset?token=${encodeURIComponent(token)}`;

    // Enviar e-mail (fire-and-forget). Adapte para seu provider existente.
    try {
      await sendAdminPasswordResetEmail({
        to: admin.email ?? '',
        name: admin.nome ?? '',
        resetLink,
        expiresSeconds: EXPIRES_SECONDS,
      });
    } catch (err) {
      console.error('Erro enviando e-mail de reset:', err);
      // não falhar para o usuário (evita vazamento)
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/admins/forgot error', err);
    // Resposta genérica
    return NextResponse.json({ ok: true });
  }
}
