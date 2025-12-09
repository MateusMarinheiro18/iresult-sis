// src/app/api/admins/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// substitua pelo seu guard real
async function checkIsSuperAdminOrSession(req: NextRequest) {
  return true;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type UpdateBody = {
  nome?: string;
  email?: string;
  senha?: string | null;
  ativo?: number | boolean | null; // aceitamos, mas NÃO mandaremos para prisma por padrão
  updated_by?: number | null;
};

async function resolveParams(paramsAny: any) {
  return await paramsAny;
}

export async function PUT(request: NextRequest, context: { params: any }) {
  try {
    const allowed = await checkIsSuperAdminOrSession(request);
    if (!allowed) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const params = await resolveParams(context.params);
    const idStr = params?.id;
    const adminId = Number(idStr);
    if (Number.isNaN(adminId) || adminId <= 0) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = (await request.json()) as UpdateBody;
    const nome = typeof body.nome === 'string' ? body.nome.trim() : undefined;
    const email = typeof body.email === 'string' ? body.email.trim() : undefined;
    const senha = typeof body.senha === 'string' ? body.senha : undefined;

    if (nome !== undefined && (!nome || nome.length < 2)) {
      return NextResponse.json({ error: 'Nome é obrigatório (mínimo 2 caracteres).' }, { status: 400 });
    }
    if (email !== undefined && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }
    if (senha !== undefined && senha !== null && senha !== '' && senha.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    // Verifica duplicidade de email (excluindo o próprio registro)
    if (email) {
      const other = await prisma.administrador.findFirst({
        where: { email, NOT: { id: adminId } },
      });
      if (other) return NextResponse.json({ error: 'Email já cadastrado para outro administrador.' }, { status: 409 });
    }

    // Monta objeto de update apenas com campos suportados (nome, email, senhaHash)
    const data: any = {};
    if (nome !== undefined) data.nome = nome;
    if (email !== undefined) data.email = email;

    // senha -> gerar hash e adicionar como senhaHash
    if (senha !== undefined && senha !== null && senha !== '') {
      const saltRounds = 10;
      const salt = await bcrypt.genSalt(saltRounds);
      const senhaHash = await bcrypt.hash(senha, salt);
      data.senhaHash = senhaHash;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nada para atualizar.' }, { status: 400 });
    }

    const updated = await prisma.administrador.update({
      where: { id: adminId },
      data,
      select: { id: true, nome: true, email: true },
    });

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    console.error('PUT /api/admins/[id] error', err);
    // caso ocorra erro de validação do prisma por outro campo inesperado, capture e retorne 500
    return NextResponse.json({ error: 'Erro interno ao atualizar administrador.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: any }) {
  try {
    const allowed = await checkIsSuperAdminOrSession(request);
    if (!allowed) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const params = await resolveParams(context.params);
    const idStr = params?.id;
    const adminId = Number(idStr);
    if (Number.isNaN(adminId) || adminId <= 0) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    await prisma.administrador.delete({ where: { id: adminId } });

    return NextResponse.json({ data: { id: adminId }, message: 'Administrador removido com sucesso.' });
  } catch (err: any) {
    console.error('DELETE /api/admins/[id] error', err);
    if (err?.code === 'P2003' || err?.code === 'ER_ROW_IS_REFERENCED' || err?.code === 'ER_ROW_IS_REFERENCED_2') {
      return NextResponse.json({ error: 'Não é possível remover: existem registros relacionados.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro interno ao remover administrador.' }, { status: 500 });
  }
}
