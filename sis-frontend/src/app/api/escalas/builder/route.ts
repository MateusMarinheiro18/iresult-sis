// src/app/api/escalas/builder/route.ts
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

async function attemptCreate(
  delegate: any,
  dataCamel: Record<string, any>,
  dataSnake: Record<string, any>,
  dataPlain: Record<string, any>,
  select?: Record<string, any>
) {
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

type RespostaPayload = {
  resposta: string;
  valor: number;
};

type PerguntaPayload = {
  tempId: string;
  pergunta: string;
  ordem: number;
  moduloTempId: string;
  categoriasTempIds: string[]; // ✅ MUDOU: array de IDs
  respostas: RespostaPayload[];
};

type CategoriaPayload = {
  tempId: string;
  nome: string;
  moduloTempId: string;
};

type ModuloPayload = {
  tempId: string;
  nome: string;
  valorInicialFavoravel: string | null;
  valorFinalFavoravel: string | null;
  valorInicialIntermediario: string | null;
  valorFinalIntermediario: string | null;
  valorInicialRisco: string | null;
  valorFinalRisco: string | null;
};

type EscalaPayload = {
  nome: string;
  dataVencimento: string | null;
  ativo: number;
  modulos: ModuloPayload[];
  categorias: CategoriaPayload[];
  perguntas: PerguntaPayload[];
};

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('sis_admin_sess')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });
    }
    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) {
      return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });
    }

    const body: EscalaPayload = await req.json();

    if (!body.nome?.trim()) {
      return NextResponse.json({ error: 'Nome da escala é obrigatório.' }, { status: 400 });
    }
    if (!Array.isArray(body.modulos) || body.modulos.length === 0) {
      return NextResponse.json({ error: 'A escala deve ter pelo menos um módulo.' }, { status: 400 });
    }
    if (!Array.isArray(body.perguntas) || body.perguntas.length === 0) {
      return NextResponse.json({ error: 'A escala deve ter pelo menos uma pergunta.' }, { status: 400 });
    }

    const now = getBrasiliaDate();

    const result = await prisma.$transaction(async (tx) => {
      // 1) criar escala
      const escalaDataBase = {
        nome: String(body.nome).trim(),
        dataVencimento: body.dataVencimento ? new Date(body.dataVencimento) : null,
        ativo: typeof body.ativo === 'number' ? body.ativo : body.ativo ? 1 : 1,
      };

      const escala = await attemptCreate(
        tx.escala,
        { ...escalaDataBase, created: now, createdBy: adminId },
        { ...escalaDataBase, created: now, created_by: adminId },
        escalaDataBase,
        { id: true }
      );

      // 2) módulos
      const moduloMap = new Map<string, number>();
      for (const mod of body.modulos) {
        if (!mod.tempId) throw new Error('Modulo sem tempId');
        if (!mod.nome || !String(mod.nome).trim()) throw new Error('Módulo sem nome');

        const parseNullable = (v: string | null) =>
          v != null && String(v).trim() !== '' ? parseFloat(String(v).trim()) : null;

        const modBase = {
          nome: String(mod.nome).trim(),
          idEscala: escala.id,
          valorInicialFavoravel: parseNullable(mod.valorInicialFavoravel),
          valorFinalFavoravel: parseNullable(mod.valorFinalFavoravel),
          valorInicialIntermediario: parseNullable(mod.valorInicialIntermediario),
          valorFinalIntermediario: parseNullable(mod.valorFinalIntermediario),
          valorInicialRisco: parseNullable(mod.valorInicialRisco),
          valorFinalRisco: parseNullable(mod.valorFinalRisco),
          ativo: 1,
        };

        const modulo = await attemptCreate(
          tx.escalaModulo,
          { ...modBase, created: now, createdBy: adminId },
          { ...modBase, created: now, created_by: adminId },
          modBase,
          { id: true }
        );

        moduloMap.set(mod.tempId, modulo.id);
      }

      // 3) categorias
      const categoriaMap = new Map<string, number>();
      for (const cat of body.categorias ?? []) {
        if (!cat.tempId) throw new Error('Categoria sem tempId');
        if (!cat.nome || !String(cat.nome).trim()) throw new Error('Categoria sem nome');

        const idModulo = moduloMap.get(cat.moduloTempId);
        if (!idModulo) throw new Error(`Módulo não encontrado para categoria ${cat.nome}`);

        const catBase = {
          nome: String(cat.nome).trim(),
          idModulo,
          ativo: 1,
        };

        const categoria = await attemptCreate(
          tx.escalaCategoria,
          { ...catBase, created: now, createdBy: adminId },
          { ...catBase, created: now, created_by: adminId },
          catBase,
          { id: true }
        );

        categoriaMap.set(cat.tempId, categoria.id);
      }

      // 4) perguntas + respostas + relações com categorias
      for (const perg of body.perguntas) {
        if (!perg.tempId) throw new Error('Pergunta sem tempId');
        if (!perg.pergunta || !String(perg.pergunta).trim()) throw new Error('Pergunta sem texto');

        const idModulo = moduloMap.get(perg.moduloTempId);
        if (!idModulo) throw new Error(`Módulo não encontrado para pergunta: ${perg.pergunta}`);

        // ✅ MUDOU: não precisa mais de idCategoria único
        const perguntaBase = {
          pergunta: String(perg.pergunta).trim(),
          idEscala: escala.id,
          idModulo,
          ordem: Number(perg.ordem) || 0,
          ativo: 1,
        };

        const pergunta = await attemptCreate(
          tx.escalaPergunta,
          { ...perguntaBase, created: now, createdBy: adminId },
          { ...perguntaBase, created: now, created_by: adminId },
          perguntaBase,
          { id: true }
        );

        // ✅ NOVO: criar relações many-to-many com categorias
        if (perg.categoriasTempIds && perg.categoriasTempIds.length > 0) {
          for (let i = 0; i < perg.categoriasTempIds.length; i++) {
            const catTempId = perg.categoriasTempIds[i];
            const categoriaIdReal = categoriaMap.get(catTempId);
            
            if (!categoriaIdReal) {
              console.warn(`Categoria ${catTempId} não encontrada para pergunta ${perg.pergunta}`);
              continue;
            }

            // Tenta diferentes nomenclaturas possíveis
            try {
              await (tx as any).escalaPerguntaCategoria.create({
                data: {
                  perguntaId: pergunta.id,
                  categoriaId: categoriaIdReal,
                  ordem: i + 1,
                  created: now,
                },
              });
            } catch (err) {
              // Tenta nomenclatura alternativa
              try {
                await (tx as any).escala_pergunta_categoria.create({
                  data: {
                    pergunta_id: pergunta.id,
                    categoria_id: categoriaIdReal,
                    ordem: i + 1,
                    created: now,
                  },
                });
              } catch (err2) {
                // Tenta outra variação
                await (tx as any).EscalaPerguntaCategoria.create({
                  data: {
                    idPergunta: pergunta.id,
                    idCategoria: categoriaIdReal,
                    ordem: i + 1,
                  },
                });
              }
            }
          }
        }

        // respostas
        for (const resp of perg.respostas ?? []) {
          if (!resp.resposta || !String(resp.resposta).trim()) continue;
          const respBase = {
            resposta: String(resp.resposta).trim(),
            idPergunta: pergunta.id,
            valor: Number(resp.valor) || 0,
            ativo: 1,
          };
          await attemptCreate(
            tx.escalaPerguntaResposta,
            { ...respBase, created: now, createdBy: adminId },
            { ...respBase, created: now, created_by: adminId },
            respBase
          );
        }
      }

      return escala;
    });

    return NextResponse.json({ success: true, escalaId: result.id }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/escalas/builder] Error:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao criar escala.' }, { status: 500 });
  }
}