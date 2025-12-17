import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth/jwt';

function sanitizeNumberString(s?: string) {
  return s ? s.replace(/\D+/g, '') : null;
}

function getBrasiliaDate() {
  const now = new Date();
  const localTime = now.getTime();
  const utc = localTime;
  const brasiliaOffsetInMs = -3 * 3600000;
  return new Date(utc + brasiliaOffsetInMs);
}

export async function POST(request: NextRequest) {
  try {
    /* --- AUTENTICAÇÃO --- */
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) {
      return NextResponse.json(
        { message: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) {
      return NextResponse.json(
        { message: 'Token inválido ou expirado' },
        { status: 401 }
      );
    }

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) {
      return NextResponse.json(
        { message: 'ID do administrador inválido' },
        { status: 401 }
      );
    }

    /* --- BODY --- */
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

    /* === NOVOS CAMPOS DE ENDEREÇO === */
    const logradouro =
      body.logradouro && typeof body.logradouro === 'string'
        ? body.logradouro.trim()
        : null;

    const numero =
      body.numero && typeof body.numero === 'string'
        ? body.numero.trim()
        : null;

    const complemento =
      body.complemento && typeof body.complemento === 'string'
        ? body.complemento.trim()
        : null;

    const cidade =
      body.cidade && typeof body.cidade === 'string'
        ? body.cidade.trim()
        : null;

    const estado =
      body.estado && typeof body.estado === 'string'
        ? body.estado.trim().toUpperCase()
        : null;

    const pais =
      body.pais && typeof body.pais === 'string'
        ? body.pais.trim()
        : null;

    /* --- TRATAR ESCALA --- */
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
      }
    }

    /* --- TRATAR GRUPOS --- */
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

    const dataBrasilia = getBrasiliaDate();

    /* --- CRIAR EMPRESA --- */
    const created = await prisma.empresa.create({
      data: {
        razaoSocial,
        cnpj,
        email,
        telefone,
        cep,

        // CAMPOS NOVOS DE ENDEREÇO
        logradouro,
        numero,
        complemento,
        cidade,
        estado,
        pais,

        ativo: 1,
        created: dataBrasilia,
        createdBy: adminId,
      },
    });

    /* --- CRIAR VÍNCULO DE ESCALA SE HOUVER --- */
    if (escalaId !== null) {
      await prisma.escalaHasEmpresa.create({
        data: {
          idEmpresa: created.id,
          idEscala: escalaId,
        },
      });
    }

    /* --- CRIAR GRUPOS --- */
    if (grupos.length > 0) {
      await prisma.empresaGrupo.createMany({
        data: grupos.map((nome) => ({
          idEmpresa: created.id,
          nome,
          ativo: 1,
          created: dataBrasilia,
          createdBy: adminId,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /api/companies error', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
