// src/app/api/admins/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendAdminAccessEmail } from '@/lib/email/sendAdminAccessEmail';

/**
 * Handlers:
 * - PUT  -> atualiza admin (e gera nova senha, como já combinado)
 * - DELETE -> remove administrador (hard delete, pois o modelo Administrador não tem campos de soft-delete)
 *
 * Ajuste checkAdminAuth para usar sua lógica de autorização.
 */

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
  // TODO: verificar sessão / token / permissões
  return true;
}

type UpdateBody = {
  nome?: string;
  email?: string;
};

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const allowed = await checkAdminAuth(request);
    if (!allowed) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const { id } = await context.params;
    const adminId = Number(id);
    if (Number.isNaN(adminId) || adminId <= 0) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as UpdateBody;
    const nome = body.nome !== undefined ? String(body.nome).trim() : undefined;
    const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : undefined;

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    // verifica existência do admin
    const existing = await prisma.administrador.findUnique({ where: { id: adminId } });
    if (!existing) {
      return NextResponse.json({ error: 'Administrador não encontrado.' }, { status: 404 });
    }

    // se email mudou, checar unicidade (exclui o próprio registro) usando findFirst já que email não é unique
    if (email && email !== existing.email) {
      const other = await prisma.administrador.findFirst({
        where: { email, id: { not: adminId } },
      });
      if (other) {
        return NextResponse.json({ error: 'Email já em uso por outro administrador.' }, { status: 409 });
      }
    }

    // gera nova senha aleatória (texto puro) e faz hash
    const plainPassword = generateRandomPassword(12);
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const senhaHash = await bcrypt.hash(plainPassword, salt);

    // atualiza admin e substitui senhaHash
    const updated = await prisma.administrador.update({
      where: { id: adminId },
      data: {
        ...(nome !== undefined ? { nome } : {}),
        ...(email !== undefined ? { email } : {}),
        senhaHash,
      },
      select: {
        id: true,
        nome: true,
        email: true,
      },
    });

    // envia e-mail com a nova senha (fire-and-forget)
    try {
      await sendAdminAccessEmail({
        to: updated.email,
        name: updated.nome,
        plainPassword,
      });
    } catch (sendErr) {
      console.error('Erro ao enviar e-mail de senha ao admin (update):', sendErr);
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error('PUT /api/admins/[id] error', err);
    return NextResponse.json({ error: 'Erro interno ao atualizar administrador.' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const allowed = await checkAdminAuth(request);
    if (!allowed) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const { id } = await context.params;
    const adminId = Number(id);
    if (Number.isNaN(adminId) || adminId <= 0) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    // verifica existência
    const existing = await prisma.administrador.findUnique({ where: { id: adminId } });
    if (!existing) {
      return NextResponse.json({ error: 'Administrador não encontrado.' }, { status: 404 });
    }

    // Apaga o registro (hard delete). Se preferir soft-delete, troque por update marcando campos deleted/deletedBy.
    try {
      await prisma.administrador.delete({ where: { id: adminId } });
    } catch (prismaErr: any) {
      console.error('Erro ao deletar administrador (prisma):', prismaErr);
      // pode ser por FK constraints — informe o problema ao cliente
      return NextResponse.json({ error: 'Erro ao deletar administrador (restrição de integridade).' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: 'Administrador removido.' });
  } catch (err) {
    console.error('DELETE /api/admins/[id] error', err);
    return NextResponse.json({ error: 'Erro interno ao deletar administrador.' }, { status: 500 });
  }
}
