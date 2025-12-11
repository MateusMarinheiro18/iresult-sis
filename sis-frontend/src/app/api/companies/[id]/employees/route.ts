// src/app/api/companies/[id]/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateEmployeeRow, parseDateStringMaybe } from '@/lib/employeeValidators';
import { verifyAdminToken } from '@/lib/auth/jwt';

// Substitua pelo seu check de autorização por company quando precisar
async function checkAdminForCompany(_adminId: number, _companyId: number) {
  return true;
}

type RouteParams = { id: string };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** retorna Date no fuso de Brasília (UTC-3) */
function getBrasiliaDate() {
  const now = new Date();
  const utcMs = now.getTime();
  const brasiliaOffsetInMs = -3 * 3600000;
  return new Date(utcMs + brasiliaOffsetInMs);
}

/** Detecta erro do Prisma tipo "Unknown argument" (campo inexistente no model) */
function isPrismaUnknownArgError(err: any) {
  const m = String(err?.message ?? '').toLowerCase();
  return /unknown argument|unknown field|field does not exist/i.test(m);
}

/** GET /api/companies/[id]/employees — listagem paginada/filtrada */
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

    // auth: exigir token no cookie
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });

    // checagem extra por empresa (stub — substitua por lógica real se quiser)
    const allowed = await checkAdminForCompany(adminId, companyId);
    if (!allowed) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

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
      const a = Number(ativoParam);
      if (!Number.isNaN(a)) where.ativo = a;
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

/** POST /api/companies/[id]/employees — criar funcionário */
type CreateBody = {
  nome?: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string | null;
  cidade_nascimento?: string | null;
  gestor?: string | null;
  ativo?: number | boolean | null;
};

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

    // auth
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });

    // company permission stub
    const allowed = await checkAdminForCompany(adminId, companyId);
    if (!allowed) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const body = (await request.json()) as CreateBody;

    const nome = body.nome?.toString().trim() ?? '';
    const email = body.email?.toString().trim() ?? '';
    const telefone = body.telefone?.toString().trim() ?? null;
    const data_nascimento_raw = body.data_nascimento?.toString().trim() ?? null;
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

    let data_nascimento: Date | null = null;
    if (data_nascimento_raw) {
      // preferir parse reutilizável se houver utilitário
      const parsed = parseDateStringMaybe ? parseDateStringMaybe(data_nascimento_raw) : null;
      if (parsed) data_nascimento = parsed;
      else {
        const d = new Date(data_nascimento_raw + 'T12:00:00.000Z');
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Data de nascimento inválida.' }, { status: 400 });
        }
        data_nascimento = d;
      }
      if (data_nascimento.getTime() > Date.now()) {
        return NextResponse.json({ error: 'Data de nascimento não pode ser no futuro.' }, { status: 400 });
      }
    }

    // montar dados base
    const baseData: any = {
      id_empresa: companyId,
      nome,
      email: email || null,
      telefone,
      data_nascimento: data_nascimento ?? null,
      cidade_nascimento,
      gestor,
      ativo: ativo ?? 1,
    };

    // audit fields
    const now = getBrasiliaDate();
    const withAuditCamel = { ...baseData, created: now, createdBy: adminId, updated: now, updatedBy: adminId };
    const withAuditSnake = { ...baseData, created: now, created_by: adminId, updated: now, updated_by: adminId };

    let createdEmployee: any;
    try {
      createdEmployee = await prisma.empresaFuncionario.create({ data: withAuditCamel });
    } catch (err: any) {
      if (isPrismaUnknownArgError(err)) {
        try {
          createdEmployee = await prisma.empresaFuncionario.create({ data: withAuditSnake });
        } catch (err2: any) {
          if (isPrismaUnknownArgError(err2)) {
            createdEmployee = await prisma.empresaFuncionario.create({ data: baseData });
          } else {
            throw err2;
          }
        }
      } else {
        throw err;
      }
    }

    return NextResponse.json({ data: createdEmployee }, { status: 201 });
  } catch (err) {
    console.error('POST /employees error', err);
    return NextResponse.json(
      { error: 'Erro interno ao criar funcionário.' },
      { status: 500 }
    );
  }
}
