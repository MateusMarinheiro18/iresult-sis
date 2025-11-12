// src/app/api/companies/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function isValidCNPJ(cnpj: string) {
  const digits = (cnpj || '').replace(/\D/g, '');
  return digits.length === 14;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolved = await params;
    const id = Number(resolved.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const empresa = await prisma.empresa.findUnique({ where: { id } });
    if (!empresa) return NextResponse.json({ message: 'Not found' }, { status: 404 });
    return NextResponse.json(empresa);
  } catch (error) {
    console.error('GET /api/companies/[id] error', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolved = await params;
    const id = Number(resolved.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();

    // Validações básicas
    if (!body?.razaoSocial || typeof body.razaoSocial !== 'string' || !body.razaoSocial.trim()) {
      return NextResponse.json({ message: 'Campo razaoSocial é obrigatório' }, { status: 400 });
    }

    if (body.cnpj && !isValidCNPJ(body.cnpj)) {
      return NextResponse.json({ message: 'CNPJ inválido' }, { status: 400 });
    }

    if (body.email && !isValidEmail(body.email)) {
      return NextResponse.json({ message: 'Email inválido' }, { status: 400 });
    }

    // tratar 'ativo' que no schema é Int?
    let ativoToSet: number | undefined = undefined;
    if (body.hasOwnProperty('ativo')) {
      const a = body.ativo;
      if (typeof a === 'boolean') ativoToSet = a ? 1 : 0;
      else if (typeof a === 'number' && (a === 0 || a === 1)) ativoToSet = a;
      else {
        return NextResponse.json({ message: 'Campo ativo inválido (esperado 0/1 ou booleano)' }, { status: 400 });
      }
    }

    // Apenas campos permitidos serão atualizados
    const dataToUpdate: any = {
      razaoSocial: body.razaoSocial,
      cnpj: body.cnpj ?? null,
      email: body.email ?? null,
      telefone: body.telefone ?? null,
      cep: body.cep ?? null,
      updated: new Date(),
    };

    if (ativoToSet !== undefined) dataToUpdate.ativo = ativoToSet;
    if (body.updatedBy !== undefined) dataToUpdate.updatedBy = Number.isNaN(Number(body.updatedBy)) ? null : Number(body.updatedBy);

    // Remover undefined
    Object.keys(dataToUpdate).forEach((k) => {
      if (dataToUpdate[k] === undefined) delete dataToUpdate[k];
    });

    const updated = await prisma.empresa.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error('PUT /api/companies/[id] error', error);

    if (error?.code === 'P2025' || /Record to update not found/i.test(error?.message ?? '')) {
      return NextResponse.json({ message: 'Empresa não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolved = await params;
    const id = Number(resolved.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    // soft-delete: set deleted timestamp
    const deleted = await prisma.empresa.update({
      where: { id },
      data: { deleted: new Date() },
    });
    return NextResponse.json({ message: 'deleted', item: deleted }, { status: 200 });
  } catch (error: any) {
    console.error('DELETE /api/companies/[id] error', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ message: 'Empresa não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
