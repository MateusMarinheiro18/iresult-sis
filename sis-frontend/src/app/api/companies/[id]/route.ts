// src/app/api/companies/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth/jwt';

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function isValidCNPJ(cnpj: string) {
  const digits = (cnpj || '').replace(/\D/g, '');
  return digits.length === 14;
}

function sanitizeNumberString(s?: string) {
  return s ? s.replace(/\D+/g, '') : null;
}

/** Mantém a lógica que você já usa para pegar hora de Brasília */
function getBrasiliaDate() {
  const now = new Date();
  const utcMs = now.getTime();
  const brasiliaOffsetInMs = -3 * 3600000;
  return new Date(utcMs + brasiliaOffsetInMs);
}

type RouteParams = { id: string };

/** Helper: detecta se erro de prisma é de "Unknown argument" (campo inexistente no model) */
function isPrismaUnknownArgError(err: any) {
  const m = String(err?.message ?? '').toLowerCase();
  return /unknown argument|unknown field|field does not exist/i.test(m);
}

/** GET — busca empresa por id (mantive sua lógica original) */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const resolved = await context.params;
    const id = Number(resolved.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id },
      include: {
        gruposFuncionarios: true,
      },
    });

    if (!empresa) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(empresa);
  } catch (error) {
    console.error('GET /api/companies/[id] error', error);
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}

/** PUT — atualizar empresa (com auditoria, escala e sincronização de grupos em transação) */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    // --- auth (extrai token do cookie e valida)
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    }
    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) {
      return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 });
    }
    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) {
      return NextResponse.json({ message: 'ID do administrador inválido' }, { status: 401 });
    }

    // --- params + validações iniciais
    const resolved = await context.params;
    const id = Number(resolved.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();

    if (
      !body?.razaoSocial ||
      typeof body.razaoSocial !== 'string' ||
      !body.razaoSocial.trim()
    ) {
      return NextResponse.json(
        { message: 'Campo razaoSocial é obrigatório' },
        { status: 400 }
      );
    }

    if (body.cnpj && !isValidCNPJ(body.cnpj)) {
      return NextResponse.json({ message: 'CNPJ inválido' }, { status: 400 });
    }

    if (body.email && !isValidEmail(body.email)) {
      return NextResponse.json({ message: 'Email inválido' }, { status: 400 });
    }

    // trata 'ativo'
    let ativoToSet: number | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(body, 'ativo')) {
      const a = body.ativo;
      if (typeof a === 'boolean') ativoToSet = a ? 1 : 0;
      else if (typeof a === 'number' && (a === 0 || a === 1)) ativoToSet = a;
      else {
        return NextResponse.json(
          { message: 'Campo ativo inválido (esperado 0/1 ou booleano)' },
          { status: 400 }
        );
      }
    }

    // trata escalaId (opcional)
    let escalaIdToSet: number | null | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(body, 'escalaId')) {
      const raw = body.escalaId;
      if (raw === null || raw === '' || raw === undefined) {
        escalaIdToSet = null; // remover vínculo
      } else {
        const n = Number(raw);
        if (Number.isNaN(n) || n <= 0) {
          return NextResponse.json({ message: 'Escala inválida' }, { status: 400 });
        }
        escalaIdToSet = n;
      }
    }

    // trata grupos (opcional)
    let gruposToSet: string[] | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(body, 'grupos')) {
      if (!Array.isArray(body.grupos)) {
        return NextResponse.json(
          { message: 'Campo grupos deve ser um array de strings' },
          { status: 400 }
        );
      }

      const norm: string[] = body.grupos
        .map((g: unknown) => String(g ?? '').trim())
        .filter((g: string) => g.length > 0);

      gruposToSet = Array.from(
        new Set(norm.map((g: string) => g.toLowerCase()))
      ).map((lower: string) => {
        const original = norm.find((g: string) => g.toLowerCase() === lower);
        return original ?? lower;
      });
    }

    // --- montagem dos dados de update (audit control no servidor)
    const now = getBrasiliaDate();
    const dataToUpdate: any = {
      razaoSocial: String(body.razaoSocial).trim(),
      cnpj: body.cnpj ? sanitizeNumberString(body.cnpj) : null,
      email: body.email ? String(body.email).trim() : null,
      telefone: body.telefone ? sanitizeNumberString(body.telefone) : null,
      cep: body.cep ? sanitizeNumberString(body.cep) : null,
      updated: now,
      updatedBy: adminId, // sempre o admin atual
    };

    if (ativoToSet !== undefined) dataToUpdate.ativo = ativoToSet;

    // limpar chaves undefined
    Object.keys(dataToUpdate).forEach((k) => {
      if (dataToUpdate[k] === undefined) delete dataToUpdate[k];
    });

    // --- transação para atomicidade: update empresa + escala + grupos
    const updatedEmpresa = await prisma.$transaction(async (tx) => {
      // 1) update empresa
      const updated = await tx.empresa.update({
        where: { id },
        data: dataToUpdate,
      });

      // 2) atualizar vínculo escala (se solicitado)
      if (escalaIdToSet !== undefined) {
        // remove vínculos antigos
        await tx.escalaHasEmpresa.deleteMany({ where: { idEmpresa: id } });

        // se não for null, cria novo vínculo
        if (escalaIdToSet !== null) {
          // tentativa com audit fields (se o model aceitar)
          const escalaDataWithAudit: any = {
            idEmpresa: id,
            idEscala: escalaIdToSet,
            created: now,
            createdBy: adminId,
            updated: now,
            updatedBy: adminId,
          };

          try {
            await tx.escalaHasEmpresa.create({ data: escalaDataWithAudit as any });
          } catch (err: any) {
            // se for erro por campo desconhecido, tenta sem audit fields
            if (isPrismaUnknownArgError(err)) {
              const escalaDataFallback = { idEmpresa: id, idEscala: escalaIdToSet };
              await tx.escalaHasEmpresa.create({ data: escalaDataFallback });
            } else {
              throw err;
            }
          }
        }
      }

      // 3) sincronizar grupos (se solicitado)
      if (gruposToSet !== undefined) {
        // pega existentes
        const existing: (any)[] = await tx.empresaGrupo.findMany({
          where: { idEmpresa: id },
        });

        const existingByLower = new Map<string, any>(
          existing.map((g: any) => [g.nome.toLowerCase(), g])
        );

        const desiredLowerSet = new Set<string>(gruposToSet.map((g: string) => g.toLowerCase()));

        const toSoftDeleteIds: number[] = [];
        const toReactivateIds: number[] = [];

        for (const g of existing) {
          const lower = g.nome.toLowerCase();
          if (desiredLowerSet.has(lower)) {
            toReactivateIds.push(g.id);
          } else {
            toSoftDeleteIds.push(g.id);
          }
        }

        // Soft delete: marcar como inativos + deleted = agora
        if (toSoftDeleteIds.length > 0) {
          await tx.empresaGrupo.updateMany({
            where: { id: { in: toSoftDeleteIds } },
            data: {
              ativo: 0,
              deleted: now,
              deletedBy: adminId,
            },
          });
        }

        // Reativar grupos que continuam na lista
        if (toReactivateIds.length > 0) {
          await tx.empresaGrupo.updateMany({
            where: { id: { in: toReactivateIds } },
            data: {
              ativo: 1,
              deleted: null,
              deletedBy: null,
            },
          });
        }

        // criar novos (tenta com audit fields, senão cria sem)
        const toCreate: string[] = gruposToSet.filter(
          (nome: string) => !existingByLower.has(nome.toLowerCase())
        );

        if (toCreate.length > 0) {
          const gruposWithAudit = toCreate.map((nome: string) => ({
            idEmpresa: id,
            nome,
            ativo: 1,
            created: now,
            createdBy: adminId,
            updated: now,
            updatedBy: adminId,
          }));

          try {
            await tx.empresaGrupo.createMany({
              data: gruposWithAudit,
              skipDuplicates: true,
            });
          } catch (err: any) {
            if (isPrismaUnknownArgError(err)) {
              // tentar sem campos de auditoria
              const fallback = toCreate.map((nome: string) => ({
                idEmpresa: id,
                nome,
                ativo: 1,
              }));
              await tx.empresaGrupo.createMany({
                data: fallback,
                skipDuplicates: true,
              });
            } else {
              throw err;
            }
          }
        }
      }

      // return updated empresa after all operations
      const refreshed = await tx.empresa.findUnique({ where: { id } });
      return refreshed;
    });

    return NextResponse.json(updatedEmpresa, { status: 200 });
  } catch (error: any) {
    console.error('PUT /api/companies/[id] error', error);

    if (error?.code === 'P2025' || /Record to update not found/i.test(error?.message ?? '')) {
      return NextResponse.json({ message: 'Empresa não encontrada' }, { status: 404 });
    }

    if (isPrismaUnknownArgError(error)) {
      return NextResponse.json(
        { message: 'Erro de schema: verifique se os campos de auditoria existem nas tabelas.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}

/** DELETE — soft-delete (marca deleted + deletedBy) e desativa ativo = 0 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    // auth
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    }
    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) {
      return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 });
    }
    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) {
      return NextResponse.json({ message: 'ID do administrador inválido' }, { status: 401 });
    }

    const resolved = await context.params;
    const id = Number(resolved.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const now = getBrasiliaDate();

    // soft-delete: atualiza campos deleted + deletedBy, updated + updatedBy e desativa ativo
    const deleted = await prisma.empresa.update({
      where: { id },
      data: {
        deleted: now,
        deletedBy: adminId,
        updated: now,
        updatedBy: adminId,
        ativo: 0, // <- desativa a empresa ao deletar
      },
    });

    return NextResponse.json(
      { message: 'Empresa deletado com sucesso!', item: deleted },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('DELETE /api/companies/[id] error', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ message: 'Empresa não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
