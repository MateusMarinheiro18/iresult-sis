// src/app/api/admins/forgot/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { sendAdminPasswordResetEmail } from '@/lib/email/sendAdminPasswordResetEmail';

const SECRET = process.env.PASSWORD_RESET_JWT_SECRET ?? '';
const EXPIRES_SECONDS = Number(process.env.PASSWORD_RESET_TOKEN_EXPIRES_SECONDS ?? '7200'); // 2h default
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.FRONTEND_BASE_URL ?? 'http://146.190.121.239:3001';

function isValidEmail(email: string) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawEmail = String(body?.email ?? '').trim().toLowerCase();

    if (!rawEmail || !isValidEmail(rawEmail)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    // Busca admin pelo email (assumimos email único)
    const admin = await prisma.administrador.findFirst({
      where: { email: rawEmail },
      select: { id: true, nome: true, email: true },
    });

    // Se não existir, retorna erro (404)
    if (!admin) {
      return NextResponse.json({ error: 'Email não encontrado.' }, { status: 404 });
    }

    if (!SECRET) {
      console.error('PASSWORD_RESET_JWT_SECRET não configurado! Defina no .env');
      return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }

    // Gera JWT auto-contido (carrega apenas sub = admin.id)
    const token = jwt.sign({ sub: String(admin.id) }, SECRET, {
      algorithm: 'HS256',
      expiresIn: EXPIRES_SECONDS,
    });

    // Monta link com token (rota de reset deve ler token da query)
    const resetLink = `${APP_URL.replace(/\/$/, '')}/admin/reset?token=${encodeURIComponent(token)}`;

    // Envia e-mail (fire-and-forget): se falhar, logamos mas não retornamos erro ao cliente
    try {
      await sendAdminPasswordResetEmail({
        to: admin.email ?? '',
        name: admin.nome ?? '',
        resetLink,
        expiresSeconds: EXPIRES_SECONDS,
      });
      console.log(`Reset email sent to ${admin.email}`);
    } catch (sendErr) {
      console.error('Erro ao enviar e-mail de reset:', sendErr);
      // se quiser, aqui podemos retornar 500, mas por enquanto vamos logar e continuar
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/admins/forgot error', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
