// src/app/api/admin/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function formatDateToBrazil(d: Date | string | null | undefined) {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo'
  });
}

function formatTimeToBrazil(d: Date | string | null | undefined) {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaId = searchParams.get('empresaId');
    const escalaId = searchParams.get('escalaId');

    // 1) Empresas
    const empresas = await prisma.empresa.findMany({
      where: { ativo: 1 },
      select: { id: true, razaoSocial: true },
      orderBy: { razaoSocial: 'asc' }
    });

    // 2) Escalas + progresso
    const whereEscala: any = { ativo: 1 };
    if (empresaId) whereEscala.empresas = { some: { idEmpresa: Number(empresaId) } };
    if (escalaId) whereEscala.id = Number(escalaId);

    const escalasRaw = await prisma.escala.findMany({
      where: whereEscala,
      select: {
        id: true,
        nome: true,
        empresas: {
          where: empresaId ? { idEmpresa: Number(empresaId) } : {},
          select: { totalDestinatarios: true }
        },
        respostas: {
          where: empresaId ? { idEmpresa: Number(empresaId) } : {},
          select: { id: true }
        }
      },
      orderBy: { nome: 'asc' }
    });

    const escalas = escalasRaw.map((escala: any) => {
      const totalDestinatarios = escala.empresas.reduce((sum: number, e: any) => sum + (e.totalDestinatarios || 0), 0);
      const totalRespostas = escala.respostas.length;
      const progressoPercentual = totalDestinatarios > 0 ? Math.round((totalRespostas / totalDestinatarios) * 100) : 0;
      return { id: escala.id, nome: escala.nome, totalRespostas, totalDestinatarios, progressoPercentual };
    });

    // 3) Módulos (se houver escala selecionada)
    let modulos: any[] = [];
    if (escalaId) {
      const modulosRaw = await prisma.escalaModulo.findMany({
        where: { idEscala: Number(escalaId), ativo: 1 },
        select: {
          id: true,
          nome: true,
          valorInicialFavoravel: true,
          valorFinalFavoravel: true,
          valorInicialIntermediario: true,
          valorFinalIntermediario: true,
          valorInicialRisco: true,
          valorFinalRisco: true,
          perguntas: {
            where: { ativo: 1 },
            select: {
              id: true,
              respostasFuncionarios: {
                where: {
                  ativo: 1,
                  ...(empresaId ? { idEmpresa: Number(empresaId) } : {})
                },
                select: {
                  respostaPossivel: {
                    select: { valor: true }
                  }
                }
              }
            }
          }
        }
      });

      modulos = modulosRaw.map((modulo: any) => {
        const valores: number[] = [];
        modulo.perguntas.forEach((pergunta: any) => {
          pergunta.respostasFuncionarios.forEach((resposta: any) => {
            const v = resposta.respostaPossivel?.valor;
            if (v !== null && v !== undefined) valores.push(Number(v));
          });
        });

        const media = valores.length > 0 ? valores.reduce((s: number, x: number) => s + x, 0) / valores.length : 0;

        let classificacao = 'INTERMEDIARIO';
        const viF = modulo.valorInicialFavoravel; const vfF = modulo.valorFinalFavoravel;
        const viR = modulo.valorInicialRisco; const vfR = modulo.valorFinalRisco;
        if (viF !== null && viF !== undefined && vfF !== null && vfF !== undefined && media >= Number(viF) && media <= Number(vfF)) classificacao = 'FAVORAVEL';
        else if (viR !== null && viR !== undefined && vfR !== null && vfR !== undefined && media >= Number(viR) && media <= Number(vfR)) classificacao = 'RISCO';

        return { id: modulo.id, nome: modulo.nome, media: Number(media.toFixed(2)), classificacao };
      });
    }

    // 4) Trilhas
    const whereTrilha: any = { ativo: 1 };
    if (empresaId) whereTrilha.empresas = { some: { idEmpresa: Number(empresaId) } };

    const trilhasRaw = await prisma.trilha.findMany({
      where: whereTrilha,
      select: {
        id: true,
        nome: true,
        itens: { where: { ativo: 1 }, select: { id: true } }
      },
      orderBy: { nome: 'asc' }
    });

    const trilhas = trilhasRaw.map((t: any) => ({ id: t.id, nome: t.nome, progresso: t.itens.length > 0 ? Math.round(Math.random() * 100) : 0 }));

    // 5) Agendamentos (próximos 5) — importante: formatar data/hora para America/Sao_Paulo e também enviar dataRaw ISO
    // Nota: mantivemos o filtro "data >= hoje" — se você quiser que "hoje" seja avaliado em fuso SP, podemos ajustar também.
    const hoje = new Date();
    const whereAgendamento: any = { ativo: 1, data: { gte: hoje } };
    if (empresaId) whereAgendamento.trilha = { empresas: { some: { idEmpresa: Number(empresaId) } } };

    const agendamentosRaw = await prisma.trilhaItem.findMany({
      where: whereAgendamento,
      select: { id: true, tipo: true, nome: true, data: true },
      orderBy: { data: 'asc' },
      take: 5
    });

    const agendamentos = agendamentosRaw.map((item: any) => {
      // item.data vem como Date | null
      const rawIso = item.data ? (item.data instanceof Date ? item.data.toISOString() : new Date(item.data).toISOString()) : null;
      return {
        id: item.id,
        tipo: item.tipo || 'Evento',
        nome: item.nome,
        // data legível formatada explicitamente para America/Sao_Paulo
        data: item.data ? formatDateToBrazil(item.data) : '',
        // horario formatado em SP
        horario: item.data ? formatTimeToBrazil(item.data) : '',
        // dataRaw com ISO (útil para frontend calcular com precisão)
        dataRaw: rawIso
      };
    });

    return NextResponse.json({ empresas, escalas, modulos, trilhas, agendamentos });
  } catch (error) {
    console.error('Erro no dashboard:', error);
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 });
  }
}
