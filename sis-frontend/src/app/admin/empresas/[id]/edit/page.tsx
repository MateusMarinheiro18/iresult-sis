import React from 'react'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import EditPageClient from './EditPageClient'

type Props = {
  params: Promise<{ id: string }> | { id: string }
}

async function getCompanyById(id: number) {
  return prisma.empresa.findUnique({ where: { id } })
}

export default async function Page({ params }: Props) {
  const resolvedParams = await params
  const idStr = resolvedParams?.id

  if (!idStr) {
    notFound()
  }

  const id = Number(idStr)
  if (Number.isNaN(id)) {
    notFound()
  }

  let company
  try {
    company = await getCompanyById(id)
  } catch (err) {
    console.error('Erro ao buscar empresa via prisma', err)
    company = null
  }

  if (!company) {
    notFound()
  }

  // Serializar dados para o cliente
  const serializedCompany = {
    id: company.id,
    razaoSocial: company.razaoSocial ?? null,
    cnpj: company.cnpj ?? null,
    email: company.email ?? null,
    telefone: company.telefone ?? null,
    cep: company.cep ?? null,
    ativo: company.ativo ?? null,
    created: company.created ? company.created.toISOString() : null,
    updated: company.updated ? company.updated.toISOString() : null,
  }

  return <EditPageClient company={serializedCompany} />
}