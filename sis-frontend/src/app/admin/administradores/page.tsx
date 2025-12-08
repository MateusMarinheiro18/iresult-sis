import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminsPageClient from './AdminsPageClient';

export default async function AdminsPage() {
  // Buscar administradores
  let admins: any[] = [];
  try {
    admins = await prisma.administrador.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        nome: true,
        email: true,
      },
    });
  } catch (err) {
    console.error('Erro ao buscar administradores:', err);
  }

  return <AdminsPageClient initialData={admins} />;
}
