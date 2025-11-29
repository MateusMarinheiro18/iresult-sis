// src/app/api/escalas/[id]/empresas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function checkAdmin(req: NextRequest) {
  // TODO: integrar com autenticação real
  return true;
}

/**
 * GET /api/escalas/[id]/empresas
 * Retorna todas as empresas ativas + flag "vinculada" para a escala.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // 👇 aqui é o ponto chave: await em params
  const { id } = await params;
  const escalaId = id ? Number(id) : NaN;

  if (!escalaId || Number.isNaN(escalaId) || escalaId <= 0) {
    return NextResponse.json(
      { error: 'ID de escala inválido.' },
      { status: 400 }
    );
  }

  try {
    const escala = await prisma.escala.findUnique({
      where: { id: escalaId },
      select: { id: true },
    });

    if (!escala) {
      return NextResponse.json(
        { error: 'Escala não encontrada.' },
        { status: 404 }
      );
    }

    const [empresas, vinculos] = await Promise.all([
      prisma.empresa.findMany({
        where: { ativo: 1 },
        orderBy: { razaoSocial: 'asc' },
      }),
      prisma.escalaHasEmpresa.findMany({
        where: { idEscala: escalaId },
        select: { idEmpresa: true },
      }),
    ]);

    const vinculadasSet = new Set(vinculos.map((v) => v.idEmpresa));

    const empresasOut = empresas.map((e) => ({
      id: e.id,
      razaoSocial: e.razaoSocial,
      cnpj: e.cnpj,
      telefone: e.telefone,
      vinculada: vinculadasSet.has(e.id),
    }));

    return NextResponse.json(
      {
        empresas: empresasOut,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('GET /api/escalas/[id]/empresas erro:', err);
    return NextResponse.json(
      { error: 'Erro ao listar empresas da escala.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/escalas/[id]/empresas
 * Body: { companyIds: number[] }
 * Recria todos os vínculos da escala com empresas.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // 👇 idem aqui
  const { id } = await params;
  const escalaId = id ? Number(id) : NaN;

  if (!escalaId || Number.isNaN(escalaId) || escalaId <= 0) {
    return NextResponse.json(
      { error: 'ID de escala inválido.' },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Body JSON inválido.' },
      { status: 400 }
    );
  }

  const companyIdsRaw = body?.companyIds;
  if (!Array.isArray(companyIdsRaw)) {
    return NextResponse.json(
      { error: 'Campo "companyIds" deve ser um array de números.' },
      { status: 400 }
    );
  }

  const companyIds: number[] = [];
  for (const v of companyIdsRaw) {
    const n = Number(v);
    if (!n || Number.isNaN(n) || n <= 0) {
      return NextResponse.json(
        { error: 'Todos os companyIds devem ser números válidos.' },
        { status: 400 }
      );
    }
    if (!companyIds.includes(n)) {
      companyIds.push(n);
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const escala = await tx.escala.findUnique({
        where: { id: escalaId },
        select: { id: true },
      });

      if (!escala) {
        throw new Error('ESCALA_NOT_FOUND');
      }

      await tx.escalaHasEmpresa.deleteMany({
        where: { idEscala: escalaId },
      });

      if (companyIds.length > 0) {
        await tx.escalaHasEmpresa.createMany({
          data: companyIds.map((idEmpresa) => ({
            idEscala: escalaId,
            idEmpresa,
          })),
          skipDuplicates: true,
        });
      }
    });

    return NextResponse.json(
      { success: true, companyIds },
      { status: 200 }
    );
  } catch (err: any) {
    if (err?.message === 'ESCALA_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Escala não encontrada.' },
        { status: 404 }
      );
    }

    console.error('POST /api/escalas/[id]/empresas erro:', err);
    return NextResponse.json(
      { error: 'Erro ao salvar vínculos da escala.' },
      { status: 500 }
    );
  }
}
