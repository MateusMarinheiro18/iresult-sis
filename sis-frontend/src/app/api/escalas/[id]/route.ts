// src/app/api/escalas/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = { id: string };

async function resolveEscalaId(params: Params | Promise<Params>) {
  const resolved = await params;
  const idStr = resolved?.id;
  const escalaId = idStr ? Number(idStr) : NaN;
  if (!escalaId || Number.isNaN(escalaId) || escalaId <= 0) return null;
  return escalaId;
}

// Se já tiver GET aqui, mantenha
export async function GET(_req: Request, context: { params: Params | Promise<Params> }) {
  const escalaId = await resolveEscalaId(context.params);
  if (!escalaId) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const escala = await prisma.escala.findUnique({
    where: { id: escalaId },
  });

  if (!escala) {
    return NextResponse.json({ error: 'Escala não encontrada' }, { status: 404 });
  }

  return NextResponse.json(escala);
}

export async function PUT(req: Request, context: { params: Params | Promise<Params> }) {
  const escalaId = await resolveEscalaId(context.params);
  if (!escalaId) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const body = await req.json();

  // ajuste os campos conforme seu modelo, por ex:
  // nome, descricao, ativa, thresholds, etc.
  const data: any = {
    nome: body.nome,
    descricao: body.descricao ?? null,
    ativa: typeof body.ativa === 'boolean' ? (body.ativa ? 1 : 0) : body.ativa,
  };

  try {
    const updated = await prisma.escala.update({
      where: { id: escalaId },
      data,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao atualizar escala' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: { params: Params | Promise<Params> }) {
  const escalaId = await resolveEscalaId(context.params);
  if (!escalaId) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    await prisma.escala.delete({
      where: { id: escalaId },
    });

    // 204 = sucesso sem body
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: 'Erro ao excluir escala' },
      { status: 500 }
    );
  }
}
