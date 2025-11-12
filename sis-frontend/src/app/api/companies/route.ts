// src/app/api/companies/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function sanitizeNumberString(s?: string) {
  return s ? s.replace(/\D+/g, '') : null; // remove tudo que não é dígito
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // minimal server-side validation
    if (!body.razaoSocial || typeof body.razaoSocial !== 'string') {
      return NextResponse.json({ message: 'razaoSocial is required' }, { status: 400 });
    }

    const razaoSocial = body.razaoSocial.trim();
    const cnpj = sanitizeNumberString(body.cnpj) ?? null;
    const email = body.email ? String(body.email).trim() : null;
    const telefone = sanitizeNumberString(body.telefone) ?? null;
    const cep = sanitizeNumberString(body.cep) ?? null;

    // createdBy: se tiver autenticação, pegue do token/session; por enquanto null
    const createdBy = body.createdBy ?? null;

    const created = await prisma.empresa.create({
      data: {
        razaoSocial,
        cnpj,
        email,
        telefone,
        cep,
        ativo: 1,
        created: new Date(),
        createdBy,
        // deleted, deletedBy, updated, updatedBy ficam nulos por padrão
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/companies error', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
