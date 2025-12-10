// src/app/api/companies/route.ts
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
  
  // O fuso de Brasília (America/Sao_Paulo) é UTC-3, ou seja, -180 minutos.
  const brasiliaOffsetInMs = -3 * 3600000; 

  // O truque é criar um Date no fuso de Brasília, mas 'fingindo' ser UTC,
  // o que força o objeto a se renderizar com a hora correta.
  return new Date(utc + brasiliaOffsetInMs);
}

export async function POST(request: NextRequest) {
  try {
    // Extrair e validar token JWT do cookie
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) {
      return NextResponse.json(
        { message: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { ok, payload, error } = verifyAdminToken(token);
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

    const dataBrasilia = getBrasiliaDate();

    const created = await prisma.empresa.create({
      data: {
        razaoSocial,
        cnpj,
        email,
        telefone,
        cep,
        ativo: 1,
        created: dataBrasilia,
        createdBy: adminId,
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
