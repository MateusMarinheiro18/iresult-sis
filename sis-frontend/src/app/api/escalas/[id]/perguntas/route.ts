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
  console.log('🌐 [POST /api/escalas/[id]/perguntas] Requisição recebida');
  
  try {
    const token = req.cookies.get('sis_admin_sess')?.value;
    if (!token) {
      console.warn('⚠️ Token não encontrado');
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) {
      console.warn('⚠️ Token inválido ou expirado');
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });
    }

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) {
      console.warn('⚠️ ID do administrador inválido');
      return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });
    }

    console.log('✅ Admin autenticado - ID:', adminId);

    const { id: idStr } = await params;
    const escalaId = Number(idStr);
    
    console.log('🆔 Escala ID do path:', escalaId);

    if (!escalaId || Number.isNaN(escalaId) || escalaId <= 0) {
      console.error('❌ ID da escala inválido:', idStr);
      return NextResponse.json({ error: 'ID da escala inválido.' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    
    console.log('📦 Body recebido:', JSON.stringify(body, null, 2));

    if (!body) {
      console.error('❌ Payload inválido - body é null');
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const { pergunta, moduloId, categoriasIds, respostas, ordem } = body;

    console.log('📝 Validando campos obrigatórios...');
    console.log('   - pergunta:', pergunta);
    console.log('   - moduloId:', moduloId);
    console.log('   - categoriasIds:', categoriasIds);
    console.log('   - respostas:', respostas);
    console.log('   - ordem:', ordem);

    if (!pergunta?.trim()) {
      console.error('❌ Texto da pergunta vazio ou inválido');
      return NextResponse.json({ error: 'Texto da pergunta é obrigatório.' }, { status: 400 });
    }

    if (!moduloId || Number.isNaN(Number(moduloId))) {
      console.error('❌ moduloId inválido:', moduloId);
      return NextResponse.json({ error: 'Módulo é obrigatório.' }, { status: 400 });
    }

    if (!Array.isArray(categoriasIds) || categoriasIds.length === 0) {
      console.error('❌ categoriasIds inválido:', categoriasIds);
      return NextResponse.json({ error: 'A pergunta deve ter pelo menos uma categoria.' }, { status: 400 });
    }

    if (!Array.isArray(respostas) || respostas.length === 0) {
      console.error('❌ respostas inválido:', respostas);
      return NextResponse.json({ error: 'A pergunta deve ter pelo menos uma resposta.' }, { status: 400 });
    }

    console.log('✅ Validações passaram. Iniciando transação...');

    const now = getBrasiliaDate();

    const result = await prisma.$transaction(async (tx) => {
      console.log('🔄 [Transaction] Criando pergunta...');
      
      const perguntaBase: any = {
        pergunta: pergunta.trim(),
        idEscala: escalaId,
        idModulo: Number(moduloId),
        ordem: Number(ordem) || 0,
        ativo: 1,
      };

      console.log('📋 perguntaBase:', JSON.stringify(perguntaBase, null, 2));

      const perguntaCreated = await attemptCreate(
        tx.escalaPergunta,
        { ...perguntaBase, created: now, createdBy: adminId },
        { ...perguntaBase, created: now, created_by: adminId },
        perguntaBase,
        { id: true, pergunta: true, ordem: true, idModulo: true }
      );

      console.log('✅ Pergunta criada - ID:', perguntaCreated.id);

      console.log('🔗 Associando categorias...');
      for (const catId of categoriasIds) {
        console.log(`   - Associando categoria ID ${catId}`);
        await (tx as any).escalaPerguntaHasCategoria.create({
          data: {
            pergunta: { connect: { id: perguntaCreated.id } },
            categoria: { connect: { id: Number(catId) } },
          },
        });
      }

      console.log('📝 Criando respostas...');
      const respostasCriadas = [];
      for (const r of respostas) {
        if (!r.resposta?.trim()) {
          console.warn('⚠️ Resposta sem texto, pulando:', r);
          continue;
        }
        
        const respBase: any = {
          idPergunta: perguntaCreated.id,
          resposta: r.resposta.trim(),
          valor: Number(r.valor) || 0,
          ativo: 1,
        };

        console.log('   - Criando resposta:', JSON.stringify(respBase, null, 2));
        
        const resposta = await attemptCreate(
          tx.escalaPerguntaResposta,
          { ...respBase, created: now, createdBy: adminId },
          { ...respBase, created: now, created_by: adminId },
          respBase,
          { id: true, resposta: true, valor: true }
        );
        
        console.log('     ✅ Resposta criada - ID:', resposta.id);
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

    console.log('✅ [Transaction] Concluída com sucesso!');
    console.log('📤 Retornando resultado:', JSON.stringify(result, null, 2));

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    console.error('❌ [POST /api/escalas/[id]/perguntas] Erro:', err);
    console.error('❌ Stack trace:', err.stack);
    console.error('❌ Mensagem:', err.message);
    return NextResponse.json({ error: err?.message || 'Erro ao criar pergunta.' }, { status: 500 });
  }
}
