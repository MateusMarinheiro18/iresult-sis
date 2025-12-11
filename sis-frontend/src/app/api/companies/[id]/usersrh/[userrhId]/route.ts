// src/app/api/companies/[id]/usersrh/[userrhId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateStringMaybe } from '@/lib/employeeValidators';
import { verifyAdminToken } from '@/lib/auth/jwt';

type RouteParams = { id: string; userrhId: string };

type PatchBody = {
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  cidade?: string | null;
  gestor?: string | null;
  ativo?: number | boolean | null;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getBrasiliaDate() {
  const now = new Date();
  const utcMs = now.getTime();
  const brasiliaOffsetInMs = -3 * 3600000;
  return new Date(utcMs + brasiliaOffsetInMs);
}

function isPrismaUnknownArgError(err: any) {
  const msg = String(err?.message ?? '').toLowerCase();
  return /unknown argument|unknown field|field does not exist/i.test(msg);
}

/* -------------------- PATCH (update usuário RH) -------------------- */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const p = await context.params;
    const companyId = Number(p.id);
    const userrhId = Number(p.userrhId);

    if (Number.isNaN(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'companyId inválido' }, { status: 400 });
    }
    if (Number.isNaN(userrhId) || userrhId <= 0) {
      return NextResponse.json({ error: 'userrhId inválido' }, { status: 400 });
    }

    // auth: cookie token
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });

    const body = (await request.json()) as PatchBody;

    const existing = await prisma.empresaUsuario.findUnique({
      where: { id_usuario_rh: userrhId },
    });

    if (!existing || existing.id_empresa !== companyId) {
      return NextResponse.json(
        { error: 'Usuário RH não encontrado para essa empresa.' },
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
        const exists = await prisma.empresaUsuario.findFirst({
          where: {
            id_empresa: companyId,
            email: emailRaw,
            NOT: { id_usuario_rh: userrhId },
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

    if (body.cidade !== undefined) {
      updates.cidade = body.cidade ? body.cidade.toString().trim() : null;
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

    // always control audit fields server-side
    const now = getBrasiliaDate();
    const withAuditCamel = { ...updates, updated: now, updatedBy: adminId };
    const withAuditSnake = { ...updates, updated: now, updated_by: adminId };

    // Try update with camelCase audit fields, fallback to snake_case, fallback to no-audit
    let updated: any;
    try {
      updated = await prisma.empresaUsuario.update({
        where: { id_usuario_rh: userrhId },
        data: withAuditCamel,
      });
    } catch (err: any) {
      if (isPrismaUnknownArgError(err)) {
        try {
          updated = await prisma.empresaUsuario.update({
            where: { id_usuario_rh: userrhId },
            data: withAuditSnake,
          });
        } catch (err2: any) {
          if (isPrismaUnknownArgError(err2)) {
            // last resort: update without audit fields
            updated = await prisma.empresaUsuario.update({
              where: { id_usuario_rh: userrhId },
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
    console.error('PATCH /usersrh/[userrhId] error', err);
    return NextResponse.json({ error: 'Erro interno ao atualizar usuário RH.' }, { status: 500 });
  }
}

/* -------------------- DELETE (soft-delete usuário RH) -------------------- */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const p = await context.params;
    const companyId = Number(p.id);
    const userrhId = Number(p.userrhId);

    if (Number.isNaN(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'companyId inválido' }, { status: 400 });
    }
    if (Number.isNaN(userrhId) || userrhId <= 0) {
      return NextResponse.json({ error: 'userrhId inválido' }, { status: 400 });
    }

    // auth
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });

    const existing = await prisma.empresaUsuario.findUnique({
      where: { id_usuario_rh: userrhId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Usuário RH não encontrado.' }, { status: 404 });
    }
    if (existing.id_empresa !== companyId) {
      return NextResponse.json({ error: 'Usuário RH não encontrado para essa empresa.' }, { status: 404 });
    }

    const now = getBrasiliaDate();

    // Try to update with camelCase audit fields; fallback to snake_case
    try {
      const deleted = await prisma.empresaUsuario.update({
        where: { id_usuario_rh: userrhId },
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
        // try snake_case
        try {
          const deleted = await prisma.empresaUsuario.update({
            where: { id_usuario_rh: userrhId },
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
            // last resort: minimal update
            const deleted = await prisma.empresaUsuario.update({
              where: { id_usuario_rh: userrhId },
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
    console.error('DELETE /usersrh/[userrhId] error', err);
    return NextResponse.json({ error: 'Erro interno ao deletar usuário RH.' }, { status: 500 });
  }
}
