// src/app/api/rh/forgot/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { sendRhPasswordResetEmail } from '@/lib/email/sendRhPasswordResetEmail'; // você pode criar um helper análogo ao do admin

const SECRET = process.env.PASSWORD_RESET_JWT_SECRET ?? '';
const EXPIRES_SECONDS = Number(process.env.PASSWORD_RESET_TOKEN_EXPIRES_SECONDS ?? '7200'); // 2h
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? process.env.FRONTEND_BASE_URL ?? 'http://localhost:3000';

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

    const user = await prisma.empresaUsuario.findFirst({
      where: { email: rawEmail },
      select: { 
        id_usuario_rh: true, 
        nome: true, 
        email: true,
        empresa: {
          select: {
            razaoSocial: true
          }
        }
      },
    });

    if (!user) {
      // para evitar enumeração de emails, você pode retornar ok:true aqui
      return NextResponse.json({ error: 'Email não encontrado.' }, { status: 404 });
    }

    if (!SECRET) {
      console.error('PASSWORD_RESET_JWT_SECRET não configurado!');
      return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }

    const token = jwt.sign({ sub: String(user.id_usuario_rh) }, SECRET, { algorithm: 'HS256', expiresIn: EXPIRES_SECONDS });
    const resetLink = `${APP_URL.replace(/\/$/, '')}/client/reset?token=${encodeURIComponent(token)}`;

    try {
      await sendRhPasswordResetEmail({
        to: user.email ?? '',
        name: user.nome ?? '',
        companyName: user.empresa?.razaoSocial ?? 'SIS',
        resetLink,
        expiresSeconds: EXPIRES_SECONDS,
      });
      console.log(`Reset email sent to ${user.email}`);
    } catch (sendErr) {
      console.error('Erro ao enviar e-mail de reset (RH):', sendErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/rh/forgot error', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
