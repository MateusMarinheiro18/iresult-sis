import React from 'react';
import { prisma } from '@/lib/prisma';
import EditAdminPageClient from './EditAdminPageClient';

type Props = { params: Promise<{ id: string }> | { id: string } };

export default async function EditAdminPage(props: Props) {
  const resolved = await props.params;
  const idStr = resolved?.id;
  const adminId = idStr ? Number(idStr) : NaN;

  if (Number.isNaN(adminId) || adminId <= 0) {
    return (
      <EditAdminPageClient
        error="ID do administrador inválido. A rota precisa de um id numérico."
      />
    );
  }

  let admin: any | null = null;
  try {
    admin = await prisma.administrador.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        nome: true,
        email: true,
        // senhaHash não é necessário no cliente, mas podemos selecioná-lo se desejarmos internamente.
        // não retornamos senha em texto.
        senhaHash: true,
        // se tiver created/updated/ativo no model, você pode adicioná-los aqui:
        // created: true, updated: true, ativo: true,
      },
    });
  } catch (err) {
    console.error('Erro buscando administrador:', err);
  }

  if (!admin) {
    return (
      <EditAdminPageClient
        error="Administrador não encontrado."
      />
    );
  }

  // Não envie senhaHash para o client. Mapeamos initial sem senhaHash.
  const initial = {
    id: admin.id,
    nome: admin.nome,
    email: admin.email,
    // ativo: admin.ativo ?? 1, // se existir
  };

  return <EditAdminPageClient initial={initial} />;
}
