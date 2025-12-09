// src/app/api/admins/reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SECRET = process.env.PASSWORD_RESET_JWT_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? '');
    const password = String(body?.password ?? '');
    const confirm = String(body?.confirm ?? '');

    if (!token || !password || !confirm) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }
    if (password !== confirm) {
      return NextResponse.json({ error: 'Senhas não conferem.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }
    if (!SECRET) {
      console.error('PASSWORD_RESET_JWT_SECRET não configurado!');
      return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
    }

    // Verifica token JWT (assinatura e exp)
    let payload: any = null;
    try {
      payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] }) as any;
    } catch (err) {
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 400 });
    }

    const adminId = Number(payload?.sub);
    if (!adminId) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    // Verifica que o admin ainda existe
    const admin = await prisma.administrador.findUnique({ where: { id: adminId } });
    if (!admin) return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });

    // Hash nova senha e atualiza
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(password, salt);

    await prisma.administrador.update({
      where: { id: adminId },
      data: { senhaHash },
    });

    // Opcional: invalidar sessões/refresh tokens se você os implementar (não fornecido aqui)

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/admins/reset error', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
