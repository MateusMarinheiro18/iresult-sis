import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Query = {
  q?: string;
  page?: string;
  perPage?: string;
  ativo?: string;
};

// -----------------------------
// GET - listar funcionários
// -----------------------------
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const companyId = resolvedParams.id;
  
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? undefined;
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);
  const perPage = parseInt(url.searchParams.get('perPage') ?? '10', 10);
  const ativoParam = url.searchParams.get('ativo');

  const where: any = { id_empresa: Number(companyId) };
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
}

// -----------------------------
// POST - criar novo funcionário
// -----------------------------
type Body = {
  nome?: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  cidade_nascimento?: string;
  gestor?: string;
  ativo?: number | boolean;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const companyId = Number(resolvedParams.id);
    
    if (Number.isNaN(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'companyId inválido' }, { status: 400 });
    }

    const body = (await request.json()) as Body;

    const nome = body.nome?.toString().trim() ?? '';
    const email = body.email?.toString().trim() ?? '';
    const telefone = body.telefone?.toString().trim() ?? '';
    const data_nascimento = body.data_nascimento?.toString().trim() ?? null;
    const cidade_nascimento = body.cidade_nascimento?.toString().trim() ?? null;
    const gestor = body.gestor?.toString().trim() ?? null;
    const ativo = body.ativo === undefined ? 1 : (body.ativo ? 1 : 0);

    // validações básicas
    if (!nome || nome.length < 2) {
      return NextResponse.json({ error: 'Nome é obrigatório (mínimo 2 caracteres).' }, { status: 400 });
    }

    if (email) {
      if (!isValidEmail(email)) {
        return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
      }
      // checar duplicado
      const exists = await prisma.empresaFuncionario.findFirst({
        where: { id_empresa: companyId, email: email },
      });
      if (exists) {
        return NextResponse.json({ error: 'Email já cadastrado para esta empresa.' }, { status: 409 });
      }
    }

    if (data_nascimento) {
      const d = new Date(data_nascimento);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Data de nascimento inválida.' }, { status: 400 });
      }
      if (d.getTime() > Date.now()) {
        return NextResponse.json({ error: 'Data de nascimento não pode ser no futuro.' }, { status: 400 });
      }
    }

    // cria o funcionário
    const created = await prisma.empresaFuncionario.create({
      data: {
        id_empresa: companyId,
        nome,
        email: email || null,
        telefone: telefone || null,
        data_nascimento: data_nascimento ? new Date(data_nascimento) : null,
        cidade_nascimento: cidade_nascimento || null,
        gestor: gestor || null,
        ativo: Number(ativo),
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error('Erro POST /employees:', err);
    return NextResponse.json({ error: 'Erro interno ao criar funcionário.' }, { status: 500 });
  }
}


type PatchBody = {
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  cidade_nascimento?: string | null;
  gestor?: string | null;
  ativo?: number | boolean | null;
};

// PATCH - atualizar funcionário
export async function PATCH(request: Request, { params }: { params: { companyId: string; employeeId: string } }) {
  try {
    const companyId = Number(params.companyId);
    const employeeId = Number(params.employeeId);

    if (Number.isNaN(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'companyId inválido' }, { status: 400 });
    }
    if (Number.isNaN(employeeId) || employeeId <= 0) {
      return NextResponse.json({ error: 'employeeId inválido' }, { status: 400 });
    }

    const body = (await request.json()) as PatchBody;

    // pega registro existente e valida pertença à empresa
    const existing = await prisma.empresaFuncionario.findUnique({ where: { id_funcionario: employeeId } });
    if (!existing || existing.id_empresa !== companyId) {
      return NextResponse.json({ error: 'Funcionário não encontrado para essa empresa.' }, { status: 404 });
    }

    const updates: any = {};

    if (body.nome !== undefined) {
      const nome = (body.nome ?? '').toString().trim();
      if (!nome || nome.length < 2) {
        return NextResponse.json({ error: 'Nome inválido (mínimo 2 caracteres).' }, { status: 400 });
      }
      updates.nome = nome;
    }

    if (body.email !== undefined) {
      const emailRaw = (body.email ?? '').toString().trim();
      if (emailRaw) {
        if (!isValidEmail(emailRaw)) {
          return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
        }
        // checar duplicidade dentro da mesma empresa (exclui o próprio registro)
        const exists = await prisma.empresaFuncionario.findFirst({
          where: { id_empresa: companyId, email: emailRaw, NOT: { id_funcionario: employeeId } },
        });
        if (exists) {
          return NextResponse.json({ error: 'Email já cadastrado para esta empresa.' }, { status: 409 });
        }
        updates.email = emailRaw;
      } else {
        // email vazio -> set null
        updates.email = null;
      }
    }

    if (body.telefone !== undefined) {
      const telefone = (body.telefone ?? '').toString().trim() || null;
      updates.telefone = telefone;
    }

    if (body.data_nascimento !== undefined) {
      const val = body.data_nascimento ? body.data_nascimento.toString().trim() : '';
      if (val) {
        const d = new Date(val);
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Data de nascimento inválida.' }, { status: 400 });
        }
        if (d.getTime() > Date.now()) {
          return NextResponse.json({ error: 'Data de nascimento não pode ser no futuro.' }, { status: 400 });
        }
        updates.data_nascimento = d;
      } else {
        updates.data_nascimento = null;
      }
    }

    if (body.cidade_nascimento !== undefined) {
      updates.cidade_nascimento = body.cidade_nascimento ? body.cidade_nascimento.toString().trim() : null;
    }

    if (body.gestor !== undefined) {
      updates.gestor = body.gestor ? body.gestor.toString().trim() : null;
    }

    if (body.ativo !== undefined) {
      updates.ativo = body.ativo ? 1 : 0;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 });
    }

    const updated = await prisma.empresaFuncionario.update({
      where: { id_funcionario: employeeId },
      data: {
        ...updates,
        updated: new Date(),
      },
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    console.error('PATCH /employees/[employeeId] error', err);
    return NextResponse.json({ error: 'Erro interno ao atualizar funcionário.' }, { status: 500 });
  }
}

// DELETE - soft delete (marca deleted)
export async function DELETE(request: Request, { params }: { params: { companyId: string; employeeId: string } }) {
  try {
    const companyId = Number(params.companyId);
    const employeeId = Number(params.employeeId);

    if (Number.isNaN(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'companyId inválido' }, { status: 400 });
    }
    if (Number.isNaN(employeeId) || employeeId <= 0) {
      return NextResponse.json({ error: 'employeeId inválido' }, { status: 400 });
    }

    // garante que o funcionário pertence à empresa
    const existing = await prisma.empresaFuncionario.findUnique({ where: { id_funcionario: employeeId } });
    if (!existing || existing.id_empresa !== companyId) {
      return NextResponse.json({ error: 'Funcionário não encontrado para essa empresa.' }, { status: 404 });
    }

    // soft delete: seta campo deleted
    const deleted = await prisma.empresaFuncionario.update({
      where: { id_funcionario: employeeId },
      data: { deleted: new Date() },
    });

    return NextResponse.json({ data: deleted }, { status: 200 });
  } catch (err) {
    console.error('DELETE /employees/[employeeId] error', err);
    return NextResponse.json({ error: 'Erro interno ao deletar funcionário.' }, { status: 500 });
  }
}
