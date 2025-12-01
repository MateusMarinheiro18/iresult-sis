// src/app/api/companies/[id]/usersrh/[userrhId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateStringMaybe } from '@/lib/employeeValidators'; // reuso do parser de data

// placeholder auth - keep async in case you check DB / tokens later
async function checkAdminForCompany(req: NextRequest, companyId: number) {
  // TODO: implementar verificação real (token/sessão/permissões)
  return true;
}

type PatchBody = {
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  cidade?: string | null;
  gestor?: string | null;
  ativo?: number | boolean | null;
  // senha NÃO deve ser atualizada por este endpoint (senha_hash será mantida)
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type RouteParams = { id: string; userrhId: string };

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

    const allowed = await checkAdminForCompany(request, companyId);
    if (!allowed) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

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
        const exists = await prisma.empresaUsuario.findFirst({
          where: {
            id_empresa: companyId,
            email: emailRaw,
            NOT: { id_usuario_rh: userrhId },
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

    if (body.cidade !== undefined) {
      updates.cidade = body.cidade ? body.cidade.toString().trim() : null;
    }

    if (body.gestor !== undefined) {
      updates.gestor = body.gestor ? body.gestor.toString().trim() : null;
    }

    if (body.ativo !== undefined) {
      updates.ativo = body.ativo ? 1 : 0;
    }

    // IMPORTANT: não modificamos senha_hash aqui

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo para atualizar.' },
        { status: 400 }
      );
    }

    const updated = await prisma.empresaUsuario.update({
      where: { id_usuario_rh: userrhId },
      data: {
        ...updates,
        updated: new Date(),
      },
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    console.error('PATCH /usersrh/[userrhId] error', err);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar usuário RH.' },
      { status: 500 }
    );
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

    const allowed = await checkAdminForCompany(request, companyId);
    if (!allowed) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const existing = await prisma.empresaUsuario.findUnique({
      where: { id_usuario_rh: userrhId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Usuário RH não encontrado.' },
        { status: 404 }
      );
    }

    if (existing.id_empresa !== companyId) {
      return NextResponse.json(
        { error: 'Usuário RH não encontrado para essa empresa.' },
        { status: 404 }
      );
    }

    // Soft-delete: marca timestamp em `deleted`
    const deleted = await prisma.empresaUsuario.update({
      where: { id_usuario_rh: userrhId },
      data: { deleted: new Date() },
    });

    return NextResponse.json({ data: deleted }, { status: 200 });
  } catch (err) {
    console.error('DELETE /usersrh/[userrhId] error', err);
    return NextResponse.json(
      { error: 'Erro interno ao deletar usuário RH.' },
      { status: 500 }
    );
  }
}
