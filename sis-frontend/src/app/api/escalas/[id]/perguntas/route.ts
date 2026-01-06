import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth/jwt';

function getBrasiliaDate(): Date {
  const now = new Date();
  const utcMs = now.getTime();
  const brasiliaOffsetInMs = -3 * 3600000;
  return new Date(utcMs + brasiliaOffsetInMs);
}

function isPrismaUnknownArgError(err: any) {
  const m = String(err?.message ?? '').toLowerCase();
  return /unknown argument|unknown field|field does not exist/i.test(m);
}

async function attemptCreate(delegate: any, dataCamel: any, dataSnake: any, dataPlain: any, select?: any) {
  try {
    return await delegate.create({ data: dataCamel, ...(select ? { select } : {}) });
  } catch (err: any) {
    if (isPrismaUnknownArgError(err)) {
      try {
        return await delegate.create({ data: dataSnake, ...(select ? { select } : {}) });
      } catch (err2: any) {
        if (isPrismaUnknownArgError(err2)) {
          return await delegate.create({ data: dataPlain, ...(select ? { select } : {}) });
        }
        throw err2;
      }
    }
    throw err;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = req.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });

    const { id: idStr } = await params;
    const escalaId = Number(idStr);
    if (!escalaId || Number.isNaN(escalaId) || escalaId <= 0) {
      return NextResponse.json({ error: 'ID da escala inválido.' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });

    const { pergunta, moduloId, categoriasIds, respostas, ordem } = body;

    if (!pergunta?.trim()) {
      return NextResponse.json({ error: 'Texto da pergunta é obrigatório.' }, { status: 400 });
    }

    if (!moduloId || Number.isNaN(Number(moduloId))) {
      return NextResponse.json({ error: 'Módulo é obrigatório.' }, { status: 400 });
    }

    if (!Array.isArray(categoriasIds) || categoriasIds.length === 0) {
      return NextResponse.json({ error: 'A pergunta deve ter pelo menos uma categoria.' }, { status: 400 });
    }

    if (!Array.isArray(respostas) || respostas.length === 0) {
      return NextResponse.json({ error: 'A pergunta deve ter pelo menos uma resposta.' }, { status: 400 });
    }

    const now = getBrasiliaDate();

    const result = await prisma.$transaction(async (tx) => {
      const perguntaBase: any = {
        pergunta: pergunta.trim(),
        idEscala: escalaId,
        idModulo: Number(moduloId),
        ordem: Number(ordem) || 0,
        ativo: 1,
      };

      const perguntaCreated = await attemptCreate(
        tx.escalaPergunta,
        { ...perguntaBase, created: now, createdBy: adminId },
        { ...perguntaBase, created: now, created_by: adminId },
        perguntaBase,
        { id: true, pergunta: true, ordem: true, idModulo: true }
      );

      for (const catId of categoriasIds) {
        await (tx as any).escalaPerguntaHasCategoria.create({
          data: {
            pergunta: { connect: { id: perguntaCreated.id } },
            categoria: { connect: { id: Number(catId) } },
          },
        });
      }

      const respostasCriadas = [];
      for (const r of respostas) {
        if (!r.resposta?.trim()) continue;
        const respBase: any = {
          idPergunta: perguntaCreated.id,
          resposta: r.resposta.trim(),
          valor: Number(r.valor) || 0,
          ativo: 1,
        };
        const resposta = await attemptCreate(
          tx.escalaPerguntaResposta,
          { ...respBase, created: now, createdBy: adminId },
          { ...respBase, created: now, created_by: adminId },
          respBase,
          { id: true, resposta: true, valor: true }
        );
        respostasCriadas.push(resposta);
      }

      return {
        id: perguntaCreated.id,
        pergunta: perguntaCreated.pergunta,
        ordem: perguntaCreated.ordem,
        moduloId: perguntaCreated.idModulo,
        categoriasIds,
        respostas: respostasCriadas,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error('Erro ao criar pergunta:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao criar pergunta.' }, { status: 500 });
  }
}
