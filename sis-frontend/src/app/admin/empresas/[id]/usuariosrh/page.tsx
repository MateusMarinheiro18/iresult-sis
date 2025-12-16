import React from 'react';
import { prisma } from '@/lib/prisma';
import UsersRhPageClient from './UsersRhPageClient';

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function UsersRhPage(props: Props) {
  // 1) Resolve params
  const resolvedParams = await props.params;
  const idStr = resolvedParams?.id;
  const companyId = idStr ? Number(idStr) : NaN;

  // 2) Valida companyId
  if (Number.isNaN(companyId) || companyId <= 0) {
    return (
      <div style={{ padding: 24, background: '#f3f4ff', minHeight: '100vh' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0b2527' }}>
            Erro: ID da empresa inválido
          </h1>
          <p style={{ color: '#b91c1c', marginTop: 12 }}>
            Não foi possível identificar a empresa. Verifique a URL.
          </p>
          <a href="/admin/empresas" style={{ color: '#0b2527', textDecoration: 'underline' }}>
            Voltar para empresas
          </a>
        </div>
      </div>
    );
  }

  // 3) Buscar usuários RH da empresa
  let users: any[] = [];
  try {
    users = await prisma.empresaUsuario.findMany({
      where: {
        id_empresa: companyId,
        deleted: null, // apenas usuários não deletados (soft-delete)
      },
      orderBy: { nome: 'asc' },
      select: {
        id_usuario_rh: true,
        nome: true,
        email: true,
        telefone: true,
        data_nascimento: true,
        gestor: true,
        cidade: true,
        ativo: true,
        created: true,
        updated: true,
      },
    });
  } catch (err) {
    console.error('Erro ao buscar usuários RH:', err);
  }

  // 4) Buscar nome da empresa (somente o campo necessário)
  let companyName: string | null = null;
  try {
    const company = await prisma.empresa.findUnique({
      where: { id: companyId },
      select: { razaoSocial: true },
    });
    companyName = company?.razaoSocial ?? null;
  } catch (err) {
    console.error('Erro ao buscar empresa:', err);
    companyName = null;
  }

  // 5) Renderizar Client Component com os dados e o nome da empresa
  return <UsersRhPageClient companyId={companyId} companyName={companyName} initialData={users} />;
}
