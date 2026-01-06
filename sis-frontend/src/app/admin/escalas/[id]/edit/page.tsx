// src/app/admin/escalas/[id]/edit/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import EditEscalaPageClient from './EditEscalaPageClient';
import type { EscalaFormState } from '@/components/admin/escalas/builder/types';

function makeTempId(prefix: string, id: number) {
  return `${prefix}-${id}`;
}

function safeToISODateOnly(d: unknown): string {
  if (!d) return '';
  try {
    const dt = d instanceof Date ? d : new Date(d as any);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export default async function EditEscalaPage({ params }: { params: any }) {
  // Defender contra params sendo Promise ou função (algumas chamadas do Next podem variar)
  let resolvedParams: any = params;
  if (params && typeof (params as any).then === 'function') {
    try {
      resolvedParams = await params;
    } catch {
      resolvedParams = params;
    }
  }

  const idRaw = resolvedParams?.id ?? (params && (params.id ?? null));
  const escalaId = Number.isFinite(Number(idRaw)) ? parseInt(String(idRaw), 10) : NaN;

  if (isNaN(escalaId) || escalaId <= 0) {
    notFound();
  }

  // Buscar escala com relações necessárias
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
          // nome do relacionamento de join pode variar conforme seu schema/prisma client gerado.
          // Se o seu client gerar outro nome, substitua "categoriasRel" pelo nome correto.
          categoriasRel: { include: { categoria: true } },
        },
        orderBy: { ordem: 'asc' },
      },
    },
  });

  if (!escala) {
    notFound();
  }

  // Montar modulos com tempIds previsíveis
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

  const moduloIdToTempId = new Map<number, string>();
  modulosForForm.forEach((m: any) => moduloIdToTempId.set(m.id, m.tempId));

  // Categorias com tempIds previsíveis (cat-<id>)
  const categoriasForForm = escala.modulos.flatMap((m) =>
    (m.categorias || []).map((c: any) => ({
      id: c.id,
      tempId: makeTempId('cat', c.id),
      nome: c.nome ?? '',
      moduloTempId: moduloIdToTempId.get(m.id) ?? '',
    }))
  );

  const categoriaIdToTempId = new Map<number, string>();
  categoriasForForm.forEach((c: any) => categoriaIdToTempId.set(c.id, c.tempId));

  // Perguntas (extrai categorias via join table) e respostas
  const perguntasForForm = (escala.perguntas || []).map((p: any) => {
    const categoriasTempIds: string[] = (p?.categoriasRel || [])
      .map((cr: any) =>
        cr?.categoria && typeof cr.categoria.id === 'number' ? categoriaIdToTempId.get(cr.categoria.id) ?? null : null
      )
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
    dataVencimento: safeToISODateOnly(escala.dataVencimento),
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
