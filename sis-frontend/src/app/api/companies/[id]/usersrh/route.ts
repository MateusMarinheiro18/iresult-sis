// src/app/api/companies/[id]/usersrh/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendUserAccessEmail } from '@/lib/email/sendUserAccess';
import { verifyAdminToken } from '@/lib/auth/jwt';

/**
 * NOTE:
 * - Admin NÃO fornece senha.
 * - Backend gera uma senha temporária forte, hasheia com bcrypt e salva em `senha_hash`.
 * - A senha em texto **NÃO** é retornada pela API.
 * - O envio de e-mail é disparado em background (fire-and-forget).
 */

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getBrasiliaDate() {
  const now = new Date();
  const utcMs = now.getTime();
  const brasiliaOffsetInMs = -3 * 3600000;
  return new Date(utcMs + brasiliaOffsetInMs);
}

function generateRandomPassword(length = 12) {
  return crypto
    .randomBytes(Math.ceil(length * 0.75))
    .toString('base64')
    .replace(/\+/g, 'A')
    .replace(/\//g, 'B')
    .slice(0, length);
}

/** Detecta erro do Prisma tipo "Unknown argument" (campo inexistente no model) */
function isPrismaUnknownArgError(err: any) {
  const msg = String(err?.message ?? '').toLowerCase();
  return /unknown argument|unknown field|field does not exist/i.test(msg);
}

type RouteParams = { id: string };

type CreateBody = {
  nome?: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string | null;
  cidade?: string | null;
  gestor?: string | null;
  ativo?: number | boolean | null;
  created_by?: number | null; // será ignorado: audit control no servidor
};

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
      const a = Number(ativoParam);
      if (!Number.isNaN(a)) where.ativo = a;
    }

    const total = await prisma.empresaUsuario.count({ where });

    const users = await prisma.empresaUsuario.findMany({
      where,
      orderBy: { nome: 'asc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id_usuario_rh: true,
        nome: true,
        email: true,
        telefone: true,
        data_nascimento: true,
        gestor: true,
        cidade: true,
        ativo: true,
        created: true,
        updated: true,
      },
    });

    return NextResponse.json({ data: users, meta: { total, page, perPage } });
  } catch (err) {
    console.error('GET /usersrh error', err);
    return NextResponse.json(
      { error: 'Erro interno ao listar usuários RH.' },
      { status: 500 }
    );
  }
}

/** POST — criar usuário RH
 * - Admin envia dados EXCETO senha.
 * - Server gera senha temporária, faz hash e salva em senha_hash.
 * - Não retorna senha em texto.
 */
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

    // --- auth: verificar token do admin (cookie)
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });

    // --- buscar empresa para pegar o nome
    const company = await prisma.empresa.findUnique({
      where: { id: companyId },
      select: { razaoSocial: true }
    });

    if (!company) {
      return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 });
    }

    // --- body parsing & validation
    const body = (await request.json()) as CreateBody;

    const nome = body.nome?.toString().trim() ?? '';
    const email = body.email?.toString().trim() ?? '';
    const telefone = body.telefone?.toString().trim() ?? null;
    const data_nascimento = body.data_nascimento?.toString().trim() ?? null;
    const cidade = body.cidade?.toString().trim() ?? null;
    const gestor = body.gestor?.toString().trim() ?? null;
    const ativo = body.ativo === undefined ? 1 : body.ativo ? 1 : 0;

    if (!nome || nome.length < 2) {
      return NextResponse.json(
        { error: 'Nome é obrigatório (mínimo 2 caracteres).' },
        { status: 400 }
      );
    }
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    // Verificar se email já existe (ativo ou deletado)
    const existingUser = await prisma.empresaUsuario.findFirst({
      where: { id_empresa: companyId, email: email },
      select: { id_usuario_rh: true, deleted: true }
    });

    if (existingUser) {
      // Se existe e NÃO está deletado (ativo), retornar erro
      if (!existingUser.deleted) {
        return NextResponse.json(
          { error: 'Email já cadastrado para esta empresa.' },
          { status: 409 }
        );
      }

      // Se existe mas está DELETADO, vamos reativar com as novas informações
      if (data_nascimento) {
        const d = new Date(data_nascimento + 'T12:00:00.000Z');
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Data de nascimento inválida.' }, { status: 400 });
        }
        if (d.getTime() > Date.now()) {
          return NextResponse.json({ error: 'Data de nascimento não pode ser no futuro.' }, { status: 400 });
        }
      }

      // Gerar nova senha
      const plainPassword = generateRandomPassword(12);
      const saltRounds = 10;
      const salt = await bcrypt.genSalt(saltRounds);
      const senha_hash = await bcrypt.hash(plainPassword, salt);

      const now = getBrasiliaDate();

      // Dados para atualização (reativação)
      const updateData: any = {
        nome,
        email: email || null,
        telefone,
        data_nascimento: data_nascimento ? new Date(data_nascimento + 'T12:00:00.000Z') : null,
        cidade,
        gestor,
        ativo: ativo ?? 1,
        senha_hash,
        deleted: null,
        deleted_by: null,
      };

      const withAuditCamel = {
        ...updateData,
        updated: now,
        updatedBy: adminId,
      };

      const withAuditSnake = {
        ...updateData,
        updated: now,
        updated_by: adminId,
      };

      let reactivatedUser: any;
      try {
        reactivatedUser = await prisma.empresaUsuario.update({
          where: { id_usuario_rh: existingUser.id_usuario_rh },
          data: withAuditCamel,
          select: {
            id_usuario_rh: true,
            nome: true,
            email: true,
            telefone: true,
            data_nascimento: true,
            gestor: true,
            cidade: true,
            ativo: true,
            created: true,
            updated: true,
          },
        });
      } catch (err: any) {
        if (isPrismaUnknownArgError(err)) {
          try {
            reactivatedUser = await prisma.empresaUsuario.update({
              where: { id_usuario_rh: existingUser.id_usuario_rh },
              data: withAuditSnake,
              select: {
                id_usuario_rh: true,
                nome: true,
                email: true,
                telefone: true,
                data_nascimento: true,
                gestor: true,
                cidade: true,
                ativo: true,
                created: true,
                updated: true,
              },
            });
          } catch (err2: any) {
            if (isPrismaUnknownArgError(err2)) {
              reactivatedUser = await prisma.empresaUsuario.update({
                where: { id_usuario_rh: existingUser.id_usuario_rh },
                data: updateData,
                select: {
                  id_usuario_rh: true,
                  nome: true,
                  email: true,
                  telefone: true,
                  data_nascimento: true,
                  gestor: true,
                  cidade: true,
                  ativo: true,
                  created: true,
                  updated: true,
                },
              });
            } else {
              throw err2;
            }
          }
        } else {
          throw err;
        }
      }

      // Enviar e-mail de acesso
      try {
        const to = reactivatedUser?.email ?? '';
        const name = reactivatedUser?.nome ?? nome;
        sendUserAccessEmail({
          to,
          name,
          email: to,
          plainPassword,
          companyName: company.razaoSocial ?? 'SIS',
        }).catch((sendErr) => {
          console.error('Erro enviando e-mail de acesso ao usuário RH reativado:', sendErr);
        });
      } catch (err) {
        console.error('Erro iniciando envio de e-mail (não fatal):', err);
      }

      return NextResponse.json({ data: reactivatedUser }, { status: 201 });
    }

    // Se não existe, criar novo usuário
    if (data_nascimento) {
      const d = new Date(data_nascimento + 'T12:00:00.000Z');
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Data de nascimento inválida.' }, { status: 400 });
      }
      if (d.getTime() > Date.now()) {
        return NextResponse.json({ error: 'Data de nascimento não pode ser no futuro.' }, { status: 400 });
      }
    }

    // --- gerar senha e hash
    const plainPassword = generateRandomPassword(12);
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const senha_hash = await bcrypt.hash(plainPassword, salt);

    const now = getBrasiliaDate();

    const baseData: any = {
      id_empresa: companyId,
      nome,
      email: email || null,
      telefone,
      data_nascimento: data_nascimento ? new Date(data_nascimento + 'T12:00:00.000Z') : null,
      cidade,
      gestor,
      ativo: ativo ?? 1,
      senha_hash,
    };

    const withAuditCamel = {
      ...baseData,
      created: now,
      createdBy: adminId,
      updated: now,
      updatedBy: adminId,
    };

    const withAuditSnake = {
      ...baseData,
      created: now,
      created_by: adminId,
      updated: now,
      updated_by: adminId,
    };

    let createdUser: any;
    try {
      createdUser = await prisma.empresaUsuario.create({
        data: withAuditCamel,
        select: {
          id_usuario_rh: true,
          nome: true,
          email: true,
          telefone: true,
          data_nascimento: true,
          gestor: true,
          cidade: true,
          ativo: true,
          created: true,
          updated: true,
        },
      });
    } catch (err: any) {
      if (isPrismaUnknownArgError(err)) {
        try {
          createdUser = await prisma.empresaUsuario.create({
            data: withAuditSnake,
            select: {
              id_usuario_rh: true,
              nome: true,
              email: true,
              telefone: true,
              data_nascimento: true,
              gestor: true,
              cidade: true,
              ativo: true,
              created: true,
              updated: true,
            },
          });
        } catch (err2: any) {
          if (isPrismaUnknownArgError(err2)) {
            createdUser = await prisma.empresaUsuario.create({
              data: baseData,
              select: {
                id_usuario_rh: true,
                nome: true,
                email: true,
                telefone: true,
                data_nascimento: true,
                gestor: true,
                cidade: true,
                ativo: true,
                created: true,
                updated: true,
              },
            });
          } else {
            throw err2;
          }
        }
      } else {
        throw err;
      }
    }

    // Dispara envio de e-mail em background (fire-and-forget)
    try {
      const to = createdUser?.email ?? '';
      const name = createdUser?.nome ?? nome;
      sendUserAccessEmail({
        to,
        name,
        email: to,
        plainPassword,
        companyName: company.razaoSocial ?? 'SIS',
      }).catch((sendErr) => {
        console.error('Erro enviando e-mail de acesso ao usuário RH:', sendErr);
      });
    } catch (err) {
      console.error('Erro iniciando envio de e-mail (não fatal):', err);
    }

    return NextResponse.json({ data: createdUser }, { status: 201 });
  } catch (err: any) {
    console.error('POST /usersrh error', err);

    if (err?.code === 'P2003') {
      return NextResponse.json({ error: 'Chave estrangeira inválida (company pode não existir).' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Erro interno ao criar usuário RH.' }, { status: 500 });
  }
}
