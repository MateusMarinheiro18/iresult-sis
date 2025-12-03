// src/app/api/companies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function sanitizeNumberString(s?: string) {
  return s ? s.replace(/\D+/g, '') : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.razaoSocial || typeof body.razaoSocial !== 'string') {
      return NextResponse.json(
        { message: 'razaoSocial is required' },
        { status: 400 }
      );
    }

    const razaoSocial = body.razaoSocial.trim();
    const cnpj = sanitizeNumberString(body.cnpj) ?? null;
    const email = body.email ? String(body.email).trim() : null;
    const telefone = sanitizeNumberString(body.telefone) ?? null;
    const cep = sanitizeNumberString(body.cep) ?? null;

    const createdBy = body.createdBy ?? null;

    // trata escalaId (opcional)
    let escalaId: number | null = null;
    if (body.hasOwnProperty('escalaId')) {
      const raw = body.escalaId;
      if (raw !== null && raw !== '' && raw !== undefined) {
        const n = Number(raw);
        if (Number.isNaN(n) || n <= 0) {
          return NextResponse.json(
            { message: 'Escala inválida' },
            { status: 400 }
          );
        }
        escalaId = n;
      } else {
        escalaId = null;
      }
    }

    // trata grupos (opcional) - array de strings
    let grupos: string[] = [];
    if (Array.isArray(body.grupos)) {
      grupos = Array.from(
        new Set(
          body.grupos
            .map((g: any) => String(g ?? '').trim())
            .filter((g: string) => g.length > 0)
        )
      );
    }

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
      },
    });

    // cria vínculo na EscalaHasEmpresa se houver escalaId
    if (escalaId !== null) {
      await prisma.escalaHasEmpresa.create({
        data: {
          idEmpresa: created.id,
          idEscala: escalaId,
        },
      });
    }

    // cria grupos internos, se enviados
    if (grupos.length > 0) {
      await prisma.empresaGrupo.createMany({
        data: grupos.map((nome) => ({
          idEmpresa: created.id,
          nome,
          ativo: 1,
          created: new Date(),
          createdBy,
        })),
        skipDuplicates: true, // respeita o unique (idEmpresa, nome)
      });
    }

    // poderia já retornar com os grupos, mas por enquanto mantém como antes
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/companies error', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
