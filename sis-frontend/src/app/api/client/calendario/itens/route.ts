// src/app/api/client/calendario/itens/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRhToken } from '@/lib/auth/jwt';

/**
 * GET /api/client/calendario/itens
 * Retorna itens de trilhas vinculadas à empresa do usuário RH logado.
 */

export async function GET(request: NextRequest) {
  try {
    // 1) autentica usuário RH via cookie
    const token = request.cookies.get('sis_rh_sess')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { ok, payload } = verifyRhToken(token);
    if (!ok || !payload) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });
    }

    const userId = Number(payload.sub);
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ error: 'ID do usuário inválido' }, { status: 401 });
    }

    // 2) busca usuário RH para obter id_empresa
    const user = await prisma.empresaUsuario.findUnique({
      where: { id_usuario_rh: userId },
      select: { id_empresa: true }
    });

    if (!user || !user.id_empresa) {
      return NextResponse.json({ error: 'Usuário sem empresa vinculada.' }, { status: 400 });
    }

    const companyId = Number(user.id_empresa);

    // 3) busca todos os itens de trilhas vinculadas à empresa
    const itens = await prisma.trilhaItem.findMany({
      where: {
        deleted: null,
        ativo: 1,
        trilha: {
          deleted: null,
          ativo: 1,
          empresas: {
            some: {
              idEmpresa: companyId
            }
          }
        }
      },
      include: {
        trilha: {
          select: {
            id: true,
            nome: true
          }
        }
      },
      orderBy: [
        { data: 'asc' },
        { id: 'asc' }
      ]
    });

    // 4) mapeia para formato de resposta com datas em ISO
    const mapped = itens.map((item) => ({
      id: item.id,
      nome: item.nome,
      tipo: item.tipo ?? null,
      detalhes: item.detalhes ?? null,
      data: item.data ? item.data.toISOString() : null,
      trilha: item.trilha ? { 
        id: item.trilha.id, 
        nome: item.trilha.nome 
      } : null
    }));

    return NextResponse.json({ items: mapped }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/client/calendario/itens] error:', error);
    return NextResponse.json({ error: 'Erro ao carregar itens de trilha para o calendário.' }, { status: 500 });
  }
}
