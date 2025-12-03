// src/app/api/companies/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { EmpresaGrupo } from '@prisma/client';

function isValidEmail(email: string) {
  return /^\S+@\S+\.\S+$/.test(email);
}

function isValidCNPJ(cnpj: string) {
  const digits = (cnpj || '').replace(/\D/g, '');
  return digits.length === 14;
}

type RouteParams = { id: string };

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
        // aqui você pode decidir se quer só ativos ou todos
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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
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

    // trata 'ativo' que no schema é Int?
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
          return NextResponse.json(
            { message: 'Escala inválida' },
            { status: 400 }
          );
        }
        escalaIdToSet = n;
      }
    }

    // trata grupos (opcional): se 'grupos' vier no body, vamos sincronizar
    let gruposToSet: string[] | undefined = undefined;
    if (Object.prototype.hasOwnProperty.call(body, 'grupos')) {
      if (!Array.isArray(body.grupos)) {
        return NextResponse.json(
          { message: 'Campo grupos deve ser um array de strings' },
          { status: 400 }
        );
      }

      // norm é explicitamente string[]
      const norm: string[] = body.grupos
        .map((g: unknown) => String(g ?? '').trim())
        .filter((g: string) => g.length > 0);

      // dedupe case-insensitive, preservando o texto original
      gruposToSet = Array.from(
        new Set(norm.map((g: string) => g.toLowerCase()))
      ).map((lower: string) => {
        const original = norm.find((g: string) => g.toLowerCase() === lower);
        return original ?? lower;
      });
    }

    // trata updatedBy uma vez só
    let updatedByValue: number | null = null;
    if (body.updatedBy !== undefined && body.updatedBy !== null) {
      const n = Number(body.updatedBy);
      updatedByValue = Number.isNaN(n) ? null : n;
    }

    const dataToUpdate: any = {
      razaoSocial: body.razaoSocial,
      cnpj: body.cnpj ?? null,
      email: body.email ?? null,
      telefone: body.telefone ?? null,
      cep: body.cep ?? null,
      updated: new Date(),
    };

    if (ativoToSet !== undefined) dataToUpdate.ativo = ativoToSet;
    if (updatedByValue !== null) {
      dataToUpdate.updatedBy = updatedByValue;
    }

    Object.keys(dataToUpdate).forEach((k) => {
      if (dataToUpdate[k] === undefined) delete dataToUpdate[k];
    });

    const updated = await prisma.empresa.update({
      where: { id },
      data: dataToUpdate,
    });

    // atualiza vínculo EscalaHasEmpresa se escalaIdToSet foi enviado
    if (escalaIdToSet !== undefined) {
      // remove vínculos antigos
      await prisma.escalaHasEmpresa.deleteMany({
        where: { idEmpresa: id },
      });

      // se não for null, cria novo vínculo
      if (escalaIdToSet !== null) {
        await prisma.escalaHasEmpresa.create({
          data: {
            idEmpresa: id,
            idEscala: escalaIdToSet,
          },
        });
      }
    }

    // sincroniza grupos, se enviados
    if (gruposToSet !== undefined) {
      // existing é tipado explicitamente como EmpresaGrupo[]
      const existing: EmpresaGrupo[] = await prisma.empresaGrupo.findMany({
        where: { idEmpresa: id },
      });

      const existingByLower = new Map<string, EmpresaGrupo>(
        existing.map((g: EmpresaGrupo) => [g.nome.toLowerCase(), g])
      );

      const desiredLowerSet = new Set<string>(
        gruposToSet.map((g: string) => g.toLowerCase())
      );

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

      const now = new Date();

      // Soft delete: marcar como inativos + deleted = agora
      if (toSoftDeleteIds.length > 0) {
        await prisma.empresaGrupo.updateMany({
          where: { id: { in: toSoftDeleteIds } },
          data: {
            ativo: 0,
            deleted: now,
            deletedBy: updatedByValue,
          },
        });
      }

      // Reativar grupos que continuam na lista
      if (toReactivateIds.length > 0) {
        await prisma.empresaGrupo.updateMany({
          where: { id: { in: toReactivateIds } },
          data: {
            ativo: 1,
            deleted: null,
            deletedBy: null,
          },
        });
      }

      // grupos a adicionar (não existem ainda no banco para essa empresa)
      const toCreate: string[] = gruposToSet.filter(
        (nome: string) => !existingByLower.has(nome.toLowerCase())
      );

      if (toCreate.length > 0) {
        await prisma.empresaGrupo.createMany({
          data: toCreate.map((nome: string) => ({
            idEmpresa: id,
            nome,
            ativo: 1,
            created: now,
            createdBy: updatedByValue,
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error('PUT /api/companies/[id] error', error);

    if (error?.code === 'P2025' || /Record to update not found/i.test(error?.message ?? '')) {
      return NextResponse.json(
        { message: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const resolved = await context.params;
    const id = Number(resolved.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }

    const deleted = await prisma.empresa.update({
      where: { id },
      data: { deleted: new Date() },
    });
    return NextResponse.json(
      { message: 'Empresa deletado com sucesso!', item: deleted },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('DELETE /api/companies/[id] error', error);
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { message: 'Empresa não encontrada' },
        { status: 404 }
      );
    }
    return NextResponse.json({ message: 'Internal error' }, { status: 500 });
  }
}
