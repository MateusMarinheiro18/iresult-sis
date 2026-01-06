// src/app/admin/escalas/[id]/edit/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import EditEscalaPageClient from './EditEscalaPageClient'; // ajuste relativo dependendo da sua estrutura
import type { EscalaFormState } from '@/components/admin/escalas/builder/types';

function makeTempId(prefix: string, id: number) {
  return `${prefix}-${id}`;
}

export default async function EditEscalaPage({ params }: { params: any }) {
  // Tornar robusto: params pode ser objeto ou Promise (defensivo)
  let resolvedParams: any = params;
  if (typeof params === 'function' || (params && typeof params.then === 'function')) {
    try {
      resolvedParams = await params;
    } catch {
      resolvedParams = params;
    }
  }

  const idRaw = resolvedParams?.id ?? (params && (params.id ?? null));
  const escalaId = Number.isFinite(Number(idRaw)) ? parseInt(String(idRaw), 10) : NaN;

  if (isNaN(escalaId) || escalaId <= 0) {
    // Força 404 para ids inválidos
    notFound();
  }

  // Buscar escala completa do banco (inclui modulos -> categorias, e perguntas -> respostas e join categoriasRel)
  const escala = await prisma.escala.findUnique({
    where: { id: escalaId },
    include: {
      modulos: {
        where: { ativo: 1 },
        include: {
          categorias: { where: { ativo: 1 }, orderBy: { id: 'asc' } },
        },
        orderBy: { id: 'asc' },
      },
      perguntas: {
        where: { ativo: 1 },
        include: {
          respostasPossiveis: { where: { ativo: 1 }, orderBy: { id: 'asc' } },
          // O nome exato do include depende do seu Prisma Client gerado.
          // Se seu client reclama aqui, veja a alternativa no comentário abaixo.
          categoriasRel: { include: { categoria: true } },
        },
        orderBy: { ordem: 'asc' },
      },
    },
  });

  if (!escala) {
    notFound();
  }

  // Construir módulos com tempIds previsíveis (mod-<id>)
  const modulosForForm = escala.modulos.map((m) => ({
    id: m.id,
    tempId: makeTempId('mod', m.id),
    nome: m.nome ?? '',
    valorInicialFavoravel: m.valorInicialFavoravel?.toString() ?? '',
    valorFinalFavoravel: m.valorFinalFavoravel?.toString() ?? '',
    valorInicialIntermediario: m.valorInicialIntermediario?.toString() ?? '',
    valorFinalIntermediario: m.valorFinalIntermediario?.toString() ?? '',
    valorInicialRisco: m.valorInicialRisco?.toString() ?? '',
    valorFinalRisco: m.valorFinalRisco?.toString() ?? '',
  }));

  // mapa id real -> tempId
  const moduloIdToTempId = new Map<number, string>();
  modulosForForm.forEach((m: any) => moduloIdToTempId.set(m.id, m.tempId));

  // categorias (usando tempId previsível cat-<id>)
  const categoriasForForm = escala.modulos.flatMap((m) =>
    m.categorias.map((c) => ({
      id: c.id,
      tempId: makeTempId('cat', c.id),
      nome: c.nome ?? '',
      moduloTempId: moduloIdToTempId.get(m.id) ?? '',
    }))
  );
  const categoriaIdToTempId = new Map<number, string>();
  categoriasForForm.forEach((c: any) => categoriaIdToTempId.set(c.id, c.tempId));

  // perguntas: extrair categorias via join (categoriasRel -> categoria)
  const perguntasForForm = escala.perguntas.map((p: any) => {
    const categoriasTempIds: string[] = (p?.categoriasRel || [])
      .map((cr: any) => (cr?.categoria && typeof cr.categoria.id === 'number' ? categoriaIdToTempId.get(cr.categoria.id) : null))
      .filter((x: string | null): x is string => !!x);

    const moduloTempId = p.idModulo ? (moduloIdToTempId.get(p.idModulo) ?? '') : '';

    return {
      id: p.id,
      tempId: makeTempId('perg', p.id),
      pergunta: p.pergunta ?? '',
      ordem: p.ordem ?? 0,
      moduloTempId,
      categoriasTempIds,
      respostas: (p.respostasPossiveis || []).map((r: any) => ({
        id: r.id,
        tempId: makeTempId('resp', r.id),
        resposta: r.resposta ?? '',
        valor: r.valor ?? 1,
      })),
    };
  });

  const initialData: EscalaFormState & { id: number } = {
    id: escala.id,
    nome: escala.nome ?? '',
    dataVencimento: escala.dataVencimento ? new Date(escala.dataVencimento).toISOString().split('T')[0] : '',
    ativo: escala.ativo === 1,
    modulos: modulosForForm,
    categorias: categoriasForForm,
    perguntas: perguntasForForm,
  };

  return (
    <EditEscalaPageClient
      initialData={initialData}
      escalaNome={escala.nome ?? ''}
      escalaId={escala.id}
    />
  );
}
