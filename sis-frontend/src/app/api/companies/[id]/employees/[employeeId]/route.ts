// src/app/api/companies/[id]/employees/[employeeId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateStringMaybe } from '@/lib/employeeValidators';
import { verifyAdminToken } from '@/lib/auth/jwt';

// placeholder auth check by company (keeps stub for now)
async function checkAdminForCompany(_adminId: number, _companyId: number) {
  // TODO: implementar verificação real (token/sessão/permissões)
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
  idGrupo?: number | string | null; // grupo interno da empresa
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** util: get date in Brasilia (UTC-3) */
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

    // auth: require admin token in cookie
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });

    // company-level permission check (stub)
    const allowed = await checkAdminForCompany(adminId, companyId);
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
        const exists = await prisma.empresaFuncionario.findFirst({
          where: {
            id_empresa: companyId,
            email: emailRaw,
            NOT: { id_funcionario: employeeId },
          },
        });
        if (exists) {
          return NextResponse.json({ error: 'Email já cadastrado para esta empresa.' }, { status: 409 });
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
      const val = body.data_nascimento ? body.data_nascimento.toString().trim() : '';
      if (val) {
        const d = parseDateStringMaybe(val);
        if (!d) {
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

    // NOVO: tratar idGrupo (atualizar grupo do funcionário)
    if (Object.prototype.hasOwnProperty.call(body, 'idGrupo')) {
      const raw = (body as any).idGrupo;
      let idGrupoToSet: number | null = null;

      if (raw === null || raw === '' || raw === undefined) {
        idGrupoToSet = null; // limpar grupo
      } else {
        const n = Number(raw);
        if (Number.isNaN(n) || n <= 0) {
          return NextResponse.json({ error: 'Grupo inválido.' }, { status: 400 });
        }
        idGrupoToSet = n;

        // valida se o grupo pertence à empresa e não está deletado
        const grupo = await prisma.empresaGrupo.findFirst({
          where: { id: idGrupoToSet, idEmpresa: companyId, deleted: null },
        });
        if (!grupo) {
          return NextResponse.json({ error: 'Grupo inválido para esta empresa.' }, { status: 400 });
        }
      }

      // nome do campo no DB usado no projeto anterior era `id_grupo`
      updates.id_grupo = idGrupoToSet;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 });
    }

    // sempre controlar auditoria pelo servidor (tentativa camelCase -> snake_case -> sem audit)
    const now = getBrasiliaDate();
    const withAuditCamel = { ...updates, updated: now, updatedBy: adminId };
    const withAuditSnake = { ...updates, updated: now, updated_by: adminId };

    let updated: any;
    try {
      updated = await prisma.empresaFuncionario.update({
        where: { id_funcionario: employeeId },
        data: withAuditCamel,
      });
    } catch (err: any) {
      if (isPrismaUnknownArgError(err)) {
        try {
          updated = await prisma.empresaFuncionario.update({
            where: { id_funcionario: employeeId },
            data: withAuditSnake,
          });
        } catch (err2: any) {
          if (isPrismaUnknownArgError(err2)) {
            // last resort: update without audit fields
            updated = await prisma.empresaFuncionario.update({
              where: { id_funcionario: employeeId },
              data: updates,
            });
          } else {
            throw err2;
          }
        }
      } else {
        throw err;
      }
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    console.error('PATCH /employees/[employeeId] error', err);
    return NextResponse.json({ error: 'Erro interno ao atualizar funcionário.' }, { status: 500 });
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

    // auth
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });

    // company-level permission stub
    const allowed = await checkAdminForCompany(adminId, companyId);
    if (!allowed) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const existing = await prisma.empresaFuncionario.findUnique({
      where: { id_funcionario: employeeId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Funcionário não encontrado.' }, { status: 404 });
    }
    if (existing.id_empresa !== companyId) {
      return NextResponse.json({ error: 'Funcionário não encontrado para essa empresa.' }, { status: 404 });
    }

    const now = getBrasiliaDate();

    // try camelCase audit fields first
    try {
      const deleted = await prisma.empresaFuncionario.update({
        where: { id_funcionario: employeeId },
        data: {
          deleted: now,
          deleted_by: adminId,
          updated: now,
          updated_by: adminId,
          ativo: 0,
        },
      });
      return NextResponse.json({ data: deleted }, { status: 200 });
    } catch (err: any) {
      if (isPrismaUnknownArgError(err)) {
        try {
          const deleted = await prisma.empresaFuncionario.update({
            where: { id_funcionario: employeeId },
            data: {
              deleted: now,
              deleted_by: adminId,
              updated: now,
              updated_by: adminId,
              ativo: 0,
            } as any,
          });
          return NextResponse.json({ data: deleted }, { status: 200 });
        } catch (err2: any) {
          if (isPrismaUnknownArgError(err2)) {
            // fallback minimal
            const deleted = await prisma.empresaFuncionario.update({
              where: { id_funcionario: employeeId },
              data: { deleted: now, ativo: 0 },
            });
            return NextResponse.json({ data: deleted }, { status: 200 });
          }
          throw err2;
        }
      }
      throw err;
    }
  } catch (err) {
    console.error('DELETE /employees/[employeeId] error', err);
    return NextResponse.json({ error: 'Erro interno ao deletar funcionário.' }, { status: 500 });
  }
}
