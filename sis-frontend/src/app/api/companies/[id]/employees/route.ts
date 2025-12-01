// src/app/api/companies/[id]/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateEmployeeRow } from '@/lib/employeeValidators';

// Substitua pelo seu check de autenticação/autorização
async function checkAdminForCompany(req: NextRequest, companyId: number) {
  // TODO: integrar com sessão/token e verificar permissão para companyId
  return true;
}

type RouteParams = { id: string };

// GET /api/companies/[id]/employees
export async function GET(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await context.params;
    const companyId = Number(id);

    if (Number.isNaN(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'companyId inválido' }, { status: 400 });
    }

    const url = new URL(request.url);
    const q = url.searchParams.get('q') ?? undefined;
    const page = parseInt(url.searchParams.get('page') ?? '1', 10) || 1;
    const perPage = parseInt(url.searchParams.get('perPage') ?? '10', 10) || 10;
    const ativoParam = url.searchParams.get('ativo');

    const where: any = { id_empresa: companyId, deleted: null };
    if (q) {
      where.OR = [
        { nome: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { telefone: { contains: q } },
      ];
    }
    if (typeof ativoParam === 'string') {
      where.ativo = Number(ativoParam);
    }

    const total = await prisma.empresaFuncionario.count({ where });

    const employees = await prisma.empresaFuncionario.findMany({
      where,
      orderBy: { nome: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return NextResponse.json({ data: employees, meta: { total, page, perPage } });
  } catch (err) {
    console.error('GET /employees error', err);
    return NextResponse.json(
      { error: 'Erro interno ao listar funcionários.' },
      { status: 500 }
    );
  }
}

type CreateBody = {
  nome?: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string | null;
  cidade_nascimento?: string | null;
  gestor?: string | null;
  ativo?: number | boolean | null;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/companies/[id]/employees
export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const { id } = await context.params;
    const companyId = Number(id);

    if (Number.isNaN(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'companyId inválido' }, { status: 400 });
    }

    const allowed = await checkAdminForCompany(request, companyId);
    if (!allowed) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const body = (await request.json()) as CreateBody;

    const nome = body.nome?.toString().trim() ?? '';
    const email = body.email?.toString().trim() ?? '';
    const telefone = body.telefone?.toString().trim() ?? null;
    const data_nascimento = body.data_nascimento?.toString().trim() ?? null;
    const cidade_nascimento = body.cidade_nascimento?.toString().trim() ?? null;
    const gestor = body.gestor?.toString().trim() ?? null;
    const ativo = body.ativo === undefined ? 1 : body.ativo ? 1 : 0;

    // validações
    if (!nome || nome.length < 2) {
      return NextResponse.json(
        { error: 'Nome é obrigatório (mínimo 2 caracteres).' },
        { status: 400 }
      );
    }
    if (email) {
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
      }
      const exists = await prisma.empresaFuncionario.findFirst({
        where: { id_empresa: companyId, email: email },
      });
      if (exists) {
        return NextResponse.json(
          { error: 'Email já cadastrado para esta empresa.' },
          { status: 409 }
        );
      }
    }
    if (data_nascimento) {
      const d = new Date(data_nascimento + 'T12:00:00.000Z'); // Adiciona meio-dia UTC
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { error: 'Data de nascimento inválida.' },
          { status: 400 }
        );
      }
      if (d.getTime() > Date.now()) {
        return NextResponse.json(
          { error: 'Data de nascimento não pode ser no futuro.' },
          { status: 400 }
        );
      }
    }

    const newEmployee = await prisma.empresaFuncionario.create({
      data: {
        id_empresa: companyId,
        nome,
        email,
        telefone,
        data_nascimento: data_nascimento
          ? new Date(data_nascimento + 'T12:00:00.000Z')
          : null,
        cidade_nascimento,
        gestor,
        ativo: ativo ?? 1,
      },
    });

    return NextResponse.json({ data: newEmployee }, { status: 201 });
  } catch (err) {
    console.error('POST /employees error', err);
    return NextResponse.json(
      { error: 'Erro interno ao criar funcionário.' },
      { status: 500 }
    );
  }
}
