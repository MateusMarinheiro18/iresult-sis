// app/api/client/trilhas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import cookie from 'cookie';
import { prisma } from '@/lib/prisma';
import { verifyRhToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest, context: any) {
  try {
    // -- 1) obter id do params (desembrulhar se for Promise)
    let params = context?.params;
    if (params && typeof (params as any).then === 'function') {
      params = await params;
    }
    const idStr = params?.id;
    const trilhaId = idStr ? Number(idStr) : NaN;
    if (!trilhaId || Number.isNaN(trilhaId) || trilhaId <= 0) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // -- 2) obter empresaId: prioridade para query param, senão tenta cookie/token RH
    const url = new URL(request.url);
    const empresaIdQuery = url.searchParams.get('empresaId');
    let empresaId: number | null = null;

    if (empresaIdQuery) {
      const n = Number(empresaIdQuery);
      if (!Number.isNaN(n) && n > 0) empresaId = n;
      else return NextResponse.json({ error: 'empresaId inválido' }, { status: 400 });
    } else {
      // tenta extrair do cookie sis_rh_sess (token RH)
      const cookieHeader = request.headers.get('cookie') ?? '';
      const parsed = cookie.parse(cookieHeader || '');
      const token = parsed.sis_rh_sess;

      if (token) {
        const { ok, payload } = verifyRhToken(token);
        if (ok && payload?.sub) {
          const userId = Number(payload.sub);
          // buscar usuário RH para pegar id_empresa
          const user = await prisma.empresaUsuario.findUnique({
            where: { id_usuario_rh: userId },
            select: { id_empresa: true }
          });
          if (user && user.id_empresa) {
            empresaId = Number(user.id_empresa);
          }
        }
      }
    }

    if (!empresaId) {
      return NextResponse.json({ error: 'empresaId é obrigatório' }, { status: 400 });
    }

    // -- 3) buscar trilha apenas se vinculada à empresaId
    const trilha = await prisma.trilha.findFirst({
      where: {
        id: trilhaId,
        ativo: 1,
        deleted: null,
        empresas: { some: { idEmpresa: empresaId } }
      },
      include: {
        itens: {
          where: { deleted: null },
          select: { id: true, nome: true, tipo: true, data: true, detalhes: true }
        },
        empresas: {
          where: { idEmpresa: empresaId },
          select: {
            empresa: { select: { id: true, razaoSocial: true } }
          }
        }
      }
    });

    if (!trilha) {
      return NextResponse.json({ error: 'Trilha não encontrada ou não vinculada à empresa' }, { status: 404 });
    }

    // -- 4) montar resposta (datas em ISO)
    const empresas = (trilha.empresas ?? []).map((rel: any) => ({
      id: rel.empresa.id,
      razaoSocial: rel.empresa.razaoSocial
    }));

    const itens = (trilha.itens ?? []).map((it: any) => ({
      id: it.id,
      nome: it.nome,
      tipo: it.tipo ?? null,
      data: it.data ? (it.data instanceof Date ? it.data.toISOString() : String(it.data)) : null,
      detalhes: it.detalhes ?? null
    }));

    const trilhaOut = {
      id: trilha.id,
      nome: trilha.nome,
      ativo: trilha.ativo,
      dataCriacao: trilha.dataCriacao ? (trilha.dataCriacao instanceof Date ? trilha.dataCriacao.toISOString() : String(trilha.dataCriacao)) : null,
      itens
    };

    return NextResponse.json({ trilha: trilhaOut, empresas }, { status: 200 });
  } catch (err) {
    console.error('Erro GET /api/client/trilhas/[id]:', err);
    return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
  }
}
