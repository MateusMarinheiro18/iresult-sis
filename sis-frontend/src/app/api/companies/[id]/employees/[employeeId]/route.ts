// File: src/app/api/companies/[id]/employees/[employeeId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateStringMaybe } from '@/lib/employeeValidators';

// placeholder auth - keep async in case you check DB / tokens later
async function checkAdminForCompany(req: NextRequest, companyId: number) {
  // TODO: implement real auth/authorization
  return true;
}

type PatchBody = {
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  cidade_nascimento?: string | null;
  gestor?: string | null;
  ativo?: number | boolean | null;
  idGrupo?: number | string | null; // NOVO: grupo interno da empresa
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * NOTE: In Next App Router dynamic route handlers `params` can be a Promise.
 * Always `await params` before accessing its properties.
 */

type RouteParams = { id: string; employeeId: string };

/* -------------------- PATCH -------------------- */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const p = await context.params; // unwrap params
    const companyId = Number(p.id);
    const employeeId = Number(p.employeeId);

    if (Number.isNaN(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'companyId inválido' }, { status: 400 });
    }
    if (Number.isNaN(employeeId) || employeeId <= 0) {
      return NextResponse.json({ error: 'employeeId inválido' }, { status: 400 });
    }

    const allowed = await checkAdminForCompany(request, companyId);
    if (!allowed) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const body = (await request.json()) as PatchBody;

    const existing = await prisma.empresaFuncionario.findUnique({
      where: { id_funcionario: employeeId },
    });

    if (!existing || existing.id_empresa !== companyId) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado para essa empresa.' },
        { status: 404 }
      );
    }

    const updates: Record<string, any> = {};

    if (body.nome !== undefined) {
      const nome = (body.nome ?? '').toString().trim();
      if (!nome || nome.length < 2) {
        return NextResponse.json(
          { error: 'Nome inválido (mínimo 2 caracteres).' },
          { status: 400 }
        );
      }
      updates.nome = nome;
    }

    if (body.email !== undefined) {
      const emailRaw = (body.email ?? '').toString().trim();
      if (emailRaw) {
        if (!isValidEmail(emailRaw)) {
          return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
        }
        const exists = await prisma.empresaFuncionario.findFirst({
          where: {
            id_empresa: companyId,
            email: emailRaw,
            NOT: { id_funcionario: employeeId },
          },
        });
        if (exists) {
          return NextResponse.json(
            { error: 'Email já cadastrado para esta empresa.' },
            { status: 409 }
          );
        }
        updates.email = emailRaw;
      } else {
        updates.email = null;
      }
    }

    if (body.telefone !== undefined) {
      updates.telefone = (body.telefone ?? '').toString().trim() || null;
    }

    if (body.data_nascimento !== undefined) {
      const val = body.data_nascimento
        ? body.data_nascimento.toString().trim()
        : '';
      if (val) {
        const d = parseDateStringMaybe(val);
        if (!d) {
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
        updates.data_nascimento = d;
      } else {
        updates.data_nascimento = null;
      }
    }

    if (body.cidade_nascimento !== undefined) {
      updates.cidade_nascimento = body.cidade_nascimento
        ? body.cidade_nascimento.toString().trim()
        : null;
    }

    if (body.gestor !== undefined) {
      updates.gestor = body.gestor ? body.gestor.toString().trim() : null;
    }

    if (body.ativo !== undefined) {
      updates.ativo = body.ativo ? 1 : 0;
    }

    // NOVO: tratar idGrupo (atualizar grupo do funcionário)
    if (Object.prototype.hasOwnProperty.call(body, 'idGrupo')) {
      const raw = body.idGrupo;

      let idGrupoToSet: number | null = null;

      if (raw === null || raw === '' || raw === undefined) {
        // limpar grupo
        idGrupoToSet = null;
      } else {
        const n = Number(raw);
        if (Number.isNaN(n) || n <= 0) {
          return NextResponse.json(
            { error: 'Grupo inválido.' },
            { status: 400 }
          );
        }
        idGrupoToSet = n;

        // valida se o grupo pertence à empresa e está ativo (ou pelo menos não deletado)
        const grupo = await prisma.empresaGrupo.findFirst({
          where: {
            id: idGrupoToSet,
            idEmpresa: companyId,
            deleted: null,
          },
        });

        if (!grupo) {
          return NextResponse.json(
            { error: 'Grupo inválido para esta empresa.' },
            { status: 400 }
          );
        }
      }

      updates.id_grupo = idGrupoToSet;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo para atualizar.' },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: 'Erro interno ao atualizar funcionário.' },
      { status: 500 }
    );
  }
}

/* -------------------- DELETE -------------------- */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const p = await context.params; // unwrap params
    const companyId = Number(p.id);
    const employeeId = Number(p.employeeId);

    if (Number.isNaN(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'companyId inválido' }, { status: 400 });
    }
    if (Number.isNaN(employeeId) || employeeId <= 0) {
      return NextResponse.json({ error: 'employeeId inválido' }, { status: 400 });
    }

    const allowed = await checkAdminForCompany(request, companyId);
    if (!allowed) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const existing = await prisma.empresaFuncionario.findUnique({
      where: { id_funcionario: employeeId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado.' },
        { status: 404 }
      );
    }

    if (existing.id_empresa !== companyId) {
      return NextResponse.json(
        { error: 'Funcionário não encontrado para essa empresa.' },
        { status: 404 }
      );
    }

    const deleted = await prisma.empresaFuncionario.update({
      where: { id_funcionario: employeeId },
      data: { deleted: new Date() },
    });

    return NextResponse.json({ data: deleted }, { status: 200 });
  } catch (err) {
    console.error('DELETE /employees/[employeeId] error', err);
    return NextResponse.json(
      { error: 'Erro interno ao deletar funcionário.' },
      { status: 500 }
    );
  }
}
