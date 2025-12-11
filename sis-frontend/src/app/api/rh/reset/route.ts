// src/app/api/rh/reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const SECRET = process.env.PASSWORD_RESET_JWT_SECRET || '';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;
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

    let payload: any;
    try {
      payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] }) as any;
    } catch (err) {
      return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 400 });
    }

    const userId = Number(payload?.sub);
    if (!userId) return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });

    const user = await prisma.empresaUsuario.findUnique({ where: { id_usuario_rh: userId } });
    if (!user) return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(password, salt);

    await prisma.empresaUsuario.update({ where: { id_usuario_rh: userId }, data: { senha_hash: senhaHash } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/rh/reset error', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
