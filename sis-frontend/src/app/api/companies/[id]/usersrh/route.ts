// src/app/api/companies/[id]/usersrh/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * NOTE:
 * - Admin NÃO fornece senha.
 * - Backend gera uma senha temporária forte, hasheia com bcrypt e salva em `senha_hash`.
 * - A senha em texto **NÃO** é retornada pela API.
 * - Mais à frente você implementará envio de e-mail ou fluxo de ativação.
 */

// checagem de autorização (stub — substitua pela sua lógica)
async function checkAdminForCompany(req: Request, companyId: number) {
  // TODO: integrar com sessão/token e verificar permissão para companyId
  return true;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** GET — listagem paginada / filtrada */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const companyId = Number(params.id);
    if (Number.isNaN(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'companyId inválido' }, { status: 400 });
    }

    const url = new URL(req.url);
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
    return NextResponse.json({ error: 'Erro interno ao listar usuários RH.' }, { status: 500 });
  }
}

/** POST — criar usuário RH
 * - Admin envia dados EXCETO senha.
 * - Server gera senha temporária, faz hash e salva em senha_hash.
 * - Não retorna senha em texto.
 */
type CreateBody = {
  nome?: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string | null;
  cidade?: string | null;
  gestor?: string | null;
  ativo?: number | boolean | null;
  created_by?: number | null; // opcional
};

function generateRandomPassword(length = 12) {
  // gera string base64-url segura e corta no tamanho desejado
  return crypto.randomBytes(Math.ceil(length * 0.75)).toString('base64').replace(/\+/g, 'A').replace(/\//g, 'B').slice(0, length);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const resolvedParams = await params;
    const companyId = Number(resolvedParams.id);
    if (Number.isNaN(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'companyId inválido' }, { status: 400 });
    }

    const allowed = await checkAdminForCompany(req, companyId);
    if (!allowed) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const body = (await req.json()) as CreateBody;

    const nome = body.nome?.toString().trim() ?? '';
    const email = body.email?.toString().trim() ?? '';
    const telefone = body.telefone?.toString().trim() ?? null;
    const data_nascimento = body.data_nascimento?.toString().trim() ?? null;
    const cidade = body.cidade?.toString().trim() ?? null;
    const gestor = body.gestor?.toString().trim() ?? null;
    const ativo = body.ativo === undefined ? 1 : (body.ativo ? 1 : 0);
    const created_by = body.created_by ?? null;

    // validações
    if (!nome || nome.length < 2) {
      return NextResponse.json({ error: 'Nome é obrigatório (mínimo 2 caracteres).' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório.' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    // email único por empresa
    const exists = await prisma.empresaUsuario.findFirst({
      where: { id_empresa: companyId, email: email },
    });
    if (exists) {
      return NextResponse.json({ error: 'Email já cadastrado para esta empresa.' }, { status: 409 });
    }

    if (data_nascimento) {
      const d = new Date(data_nascimento + 'T12:00:00.000Z');
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Data de nascimento inválida.' }, { status: 400 });
      }
      if (d.getTime() > Date.now()) {
        return NextResponse.json({ error: 'Data de nascimento não pode ser no futuro.' }, { status: 400 });
      }
    }

    // Gera senha temporária (não será retornada; apenas usada para criar hash)
    const plainPassword = generateRandomPassword(12);

    // Hash com bcrypt
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const senha_hash = await bcrypt.hash(plainPassword, salt);

    // Cria usuário com senha_hash e flag must_change_password = true (indicando que precisa definir nova senha no cliente)
    const newUser = await prisma.empresaUsuario.create({
      data: {
        id_empresa: companyId,
        nome,
        email: email || null,
        telefone,
        data_nascimento: data_nascimento ? new Date(data_nascimento + 'T12:00:00.000Z') : null,
        cidade,
        gestor,
        ativo: ativo ?? 1,
        senha_hash,
        created: new Date(),
        created_by: created_by,
      },
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

    // IMPORTANTE: NÃO retornamos a senha gerada. 
    // Opcional: aqui você pode enfileirar um e-mail para notificar o usuário com link de ativação (fluxo futuro).
    // Ex.: await sendActivationEmail(newUser.email, newUser.nome, ...)

    return NextResponse.json({ data: newUser }, { status: 201 });
  } catch (err) {
    console.error('POST /usersrh error', err);
    return NextResponse.json({ error: 'Erro interno ao criar usuário RH.' }, { status: 500 });
  }
}
