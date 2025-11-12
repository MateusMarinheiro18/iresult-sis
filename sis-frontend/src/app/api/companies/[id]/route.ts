// src/app/api/companies/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    const empresa = await prisma.empresa.findUnique({ where: { id } });
    if (!empresa) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(empresa);
  } catch (error) {
    console.error('GET /api/companies/[id] error', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    const body = await request.json();

    const updated = await prisma.empresa.update({
      where: { id },
      data: {
        razaoSocial: body.razaoSocial,
        cnpj: body.cnpj ?? null,
        email: body.email ?? null,
        telefone: body.telefone ?? null,
        cep: body.cep ?? null,
        ativo: body.ativo ?? null,
        updated: new Date(),
        updatedBy: body.updatedBy ?? null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/companies/[id] error', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    // soft-delete: set deleted timestamp (or actually delete if you prefer)
    const deleted = await prisma.empresa.update({
      where: { id },
      data: { deleted: new Date() },
    });
    return NextResponse.json({ message: 'deleted', item: deleted });
  } catch (error) {
    console.error('DELETE /api/companies/[id] error', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
