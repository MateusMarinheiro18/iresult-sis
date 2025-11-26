import React from 'react';
import EditUserRhPageClient from './EditUserRhPageClient';
import { prisma } from '@/lib/prisma';

type Props = {
  params: Promise<{ id: string; userrhId: string }> | { id: string; userrhId: string };
};

export default async function EditUserRhPage(props: Props) {
  // 1) resolve params
  const resolved = await props.params;
  const idStr = resolved?.id;
  const userrhIdStr = resolved?.userrhId;
  const companyId = idStr ? Number(idStr) : NaN;
  const userrhId = userrhIdStr ? Number(userrhIdStr) : NaN;

  if (Number.isNaN(companyId) || companyId <= 0) {
    return (
      <div className="page-root">
        <p style={{ color: 'red' }}>
          companyId inválido. A página precisa do parâmetro da rota.
        </p>
      </div>
    );
  }
  if (Number.isNaN(userrhId) || userrhId <= 0) {
    return (
      <div className="page-root">
        <p style={{ color: 'red' }}>
          userrhId inválido. A página precisa do parâmetro da rota.
        </p>
      </div>
    );
  }

  // 2) buscar empresa (nome) e usuário
  let companyName: string | null = null;
  let user: any = null;

  try {
    const company = await prisma.empresa.findUnique({
      where: { id: companyId },
      select: { razaoSocial: true },
    });
    companyName = company?.razaoSocial ?? null;
  } catch (err) {
    console.error('Erro buscando empresa:', err);
  }

  try {
    const u = await prisma.empresaUsuario.findUnique({
      where: { id_usuario_rh: userrhId },
      select: {
        id_usuario_rh: true,
        nome: true,
        email: true,
        telefone: true,
        data_nascimento: true,
        cidade: true,
        gestor: true,
        ativo: true,
        id_empresa: true,
        // senha_hash excluded on purpose
      },
    });
    user = u ?? null;
  } catch (err) {
    console.error('Erro buscando usuário RH:', err);
  }

  if (!user) {
    return (
      <div className="page-root">
        <p style={{ color: 'red' }}>Usuário RH não encontrado.</p>
      </div>
    );
  }

  // 3) render client, injetando os dados iniciais
  return (
    <EditUserRhPageClient
      companyId={companyId}
      companyName={companyName}
      userInitial={{
        id_usuario_rh: user.id_usuario_rh,
        nome: user.nome ?? '',
        email: user.email ?? '',
        telefone: user.telefone ?? '',
        data_nascimento: user.data_nascimento ? new Date(user.data_nascimento).toISOString().slice(0, 10) : '',
        cidade: user.cidade ?? '',
        gestor: user.gestor ?? '',
        ativo: !!user.ativo,
      }}
    />
  );
}
