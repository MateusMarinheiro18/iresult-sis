// src/app/admin/escalas/new/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import EditEscalaPageClient from './EditEscalaPageClient';
import type { EscalaFormState } from '@/components/admin/escalas/builder/types';

function createTempId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default async function EditEscalaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // await params primeiro
  const escalaId = parseInt(id, 10);
  
  if (isNaN(escalaId) || escalaId <= 0) {
    notFound();
  }

  // Buscar escala completa do banco
  const escala = await prisma.escala.findUnique({
    where: { id: escalaId },
    include: {
      modulos: {
        include: {
          categorias: true,
        },
      },
      perguntas: {
        include: {
          respostasPossiveis: true,
        },
        orderBy: { ordem: 'asc' },
      },
    },
  });

  if (!escala) {
    notFound();
  }

  // Converter para formato do formulário (serializable)
  const initialData: EscalaFormState & { id: number } = {
    id: escala.id,
    nome: escala.nome,
    dataVencimento: escala.dataVencimento?.toISOString().split('T')[0] ?? '',
    ativo: escala.ativo === 1,
    modulos: escala.modulos.map((m) => ({
      id: m.id,
      tempId: createTempId('mod'),
      nome: m.nome,
      valorInicialFavoravel: m.valorInicialFavoravel?.toString() ?? '',
      valorFinalFavoravel: m.valorFinalFavoravel?.toString() ?? '',
      valorInicialIntermediario: m.valorInicialIntermediario?.toString() ?? '',
      valorFinalIntermediario: m.valorFinalIntermediario?.toString() ?? '',
      valorInicialRisco: m.valorInicialRisco?.toString() ?? '',
      valorFinalRisco: m.valorFinalRisco?.toString() ?? '',
    })),
    categorias: escala.modulos.flatMap((m) =>
      m.categorias.map((c) => ({
        id: c.id,
        tempId: createTempId('cat'),
        nome: c.nome,
        moduloTempId: escala.modulos.find((mod) => mod.id === m.id)?.id?.toString() ?? '',
      }))
    ),
    perguntas: escala.perguntas.map((p) => ({
      id: p.id,
      tempId: createTempId('perg'),
      pergunta: p.pergunta,
      ordem: p.ordem ?? 0,
      moduloTempId: p.idModulo?.toString() ?? '',
      categoriaTempId: p.idCategoria?.toString() ?? '',
      respostas: p.respostasPossiveis.map((r) => ({
        id: r.id,
        tempId: createTempId('resp'),
        resposta: r.resposta,
        valor: r.valor ?? 1,
      })),
    })),
  };

  // Criar mapeamento de IDs reais para tempIds
  const moduloIdToTempId = new Map<number, string>();
  initialData.modulos.forEach((m: any) => {
    if (m.id) moduloIdToTempId.set(m.id, m.tempId);
  });

  const categoriaIdToTempId = new Map<number, string>();
  initialData.categorias.forEach((c: any) => {
    if (c.id) categoriaIdToTempId.set(c.id, c.tempId);
  });

  // Atualizar referências para usar tempIds
  initialData.categorias.forEach((c: any) => {
    const moduloId = escala.modulos
      .flatMap((m) => m.categorias)
      .find((cat) => cat.id === c.id)?.idModulo;
    if (moduloId) {
      c.moduloTempId = moduloIdToTempId.get(moduloId) ?? '';
    }
  });

  initialData.perguntas.forEach((p: any) => {
    if (p.moduloTempId && !isNaN(Number(p.moduloTempId))) {
      p.moduloTempId = moduloIdToTempId.get(Number(p.moduloTempId)) ?? '';
    }
    if (p.categoriaTempId && !isNaN(Number(p.categoriaTempId))) {
      p.categoriaTempId = categoriaIdToTempId.get(Number(p.categoriaTempId)) ?? '';
    }
  });

  return (
    <EditEscalaPageClient
      initialData={initialData}
      escalaNome={escala.nome}
      escalaId={escala.id}
    />
  );
}
