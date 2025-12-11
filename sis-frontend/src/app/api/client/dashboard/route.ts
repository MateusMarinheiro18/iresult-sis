import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * API específica para clientes — exige ?empresaId=#
 * Retorna: escalas (com progresso), modulos (média por módulo filtrada por empresa/dataEnvio),
 * trilhas (progresso por itens já ocorridos considerando fuso America/Sao_Paulo),
 * agendamentos (próximos 5 eventos da(s) trilha(s) da empresa).
 */

function formatDateToBrazil(d: Date | string | null | undefined) {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo'
  });
}
function formatTimeToBrazil(d: Date | string | null | undefined) {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}
function toDateInSaoPaulo(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dateObj.getTime())) return null;
  const asString = dateObj.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  return new Date(asString);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const empresaIdStr = searchParams.get('empresaId');
    if (!empresaIdStr) return NextResponse.json({ error: 'empresaId é obrigatório' }, { status: 400 });
    const empresaId = Number(empresaIdStr);
    if (Number.isNaN(empresaId) || empresaId <= 0) return NextResponse.json({ error: 'empresaId inválido' }, { status: 400 });

    // 1) Escalas vinculadas à empresa
    const escalasRaw = await prisma.escala.findMany({
      where: { ativo: 1, empresas: { some: { idEmpresa: empresaId } } },
      select: {
        id: true, nome: true,
        empresas: { where: { idEmpresa: empresaId }, select: { totalDestinatarios: true, dataEnvio: true } }
      },
      orderBy: { nome: 'asc' }
    });

    const escalasPromises = escalasRaw.map(async (escala: any) => {
      const totalDestinatariosFromLinks = escala.empresas.reduce((s: number, e: any) => s + (e.totalDestinatarios || 0), 0);
      let totalDestinatarios = totalDestinatariosFromLinks;
      if (totalDestinatarios === 0) {
        totalDestinatarios = await prisma.empresaFuncionario.count({ where: { id_empresa: empresaId, ativo: 1 } });
      }

      // usar dataEnvio do vínculo com esta empresa (se existir)
      const dataEnvio = escala.empresas.length > 0 ? escala.empresas[0].dataEnvio || null : null;

      const whereResposta: any = { idEscala: escala.id, ativo: 1, idEmpresa: empresaId };
      if (dataEnvio) whereResposta.dataResposta = { gte: dataEnvio };

      const respostas = await prisma.respostaFuncionario.findMany({ where: whereResposta, select: { idFuncionario: true } });
      const distinct = new Set<number>();
      respostas.forEach((r: any) => { if (r.idFuncionario != null) distinct.add(Number(r.idFuncionario)); });

      const totalRespostas = distinct.size;
      const progressoPercentual = totalDestinatarios > 0 ? Math.round((totalRespostas / totalDestinatarios) * 100) : 0;

      return { id: escala.id, nome: escala.nome, totalRespostas, totalDestinatarios, progressoPercentual };
    });

    const escalas = await Promise.all(escalasPromises);

    // 2) Módulos (somente para escalas onde a empresa tem vínculo — pegamos todos os módulos das escalas vinculadas)
    // Simples: busca módulos associados às escalas vinculadas à empresa e calcula média com filtro de empresa/dataEnvio
    const escalaIds = escalasRaw.map((s: any) => s.id);
    let modulos: any[] = [];
    if (escalaIds.length > 0) {
      const modulosRaw = await prisma.escalaModulo.findMany({
        where: { idEscala: { in: escalaIds }, ativo: 1 },
        select: {
          id: true, nome: true,
          valorInicialFavoravel: true, valorFinalFavoravel: true,
          valorInicialIntermediario: true, valorFinalIntermediario: true,
          valorInicialRisco: true, valorFinalRisco: true,
          idEscala: true
        }
      });

      const modPromises = modulosRaw.map(async (mod: any) => {
        // pegar dataEnvio do vínculo escala-empresa
        const vinc = await prisma.escalaHasEmpresa.findUnique({
          where: { idEscala_idEmpresa: { idEscala: mod.idEscala, idEmpresa: empresaId } }, select: { dataEnvio: true }
        });
        const dataEnv = vinc?.dataEnvio || null;

        const whereRes: any = { ativo: 1, pergunta: { ativo: 1, idModulo: mod.id } , idEmpresa: empresaId };
        if (dataEnv) whereRes.dataResposta = { gte: dataEnv };

        const respostas = await prisma.respostaFuncionario.findMany({
          where: whereRes,
          select: { respostaPossivel: { select: { valor: true } } }
        });

        const valores: number[] = [];
        respostas.forEach((r: any) => {
          const v = r.respostaPossivel?.valor;
          if (v !== null && v !== undefined) valores.push(Number(v));
        });

        const media = valores.length > 0 ? valores.reduce((s: number, x: number) => s + x, 0) / valores.length : 0;
        let classificacao: any = 'INTERMEDIARIO';
        const viF = mod.valorInicialFavoravel, vfF = mod.valorFinalFavoravel, viR = mod.valorInicialRisco, vfR = mod.valorFinalRisco;
        if (viF != null && vfF != null && media >= Number(viF) && media <= Number(vfF)) classificacao = 'FAVORAVEL';
        else if (viR != null && vfR != null && media >= Number(viR) && media <= Number(vfR)) classificacao = 'RISCO';

        return { id: mod.id, nome: mod.nome, media: Number(media.toFixed(2)), classificacao };
      });

      modulos = await Promise.all(modPromises);
    }

    // 3) Trilhas vinculadas à empresa — calcular progresso com base em itens cuja data já passou no fuso SP
    const trilhasRaw = await prisma.trilha.findMany({
      where: { ativo: 1, empresas: { some: { idEmpresa: empresaId } } },
      select: { id: true, nome: true, itens: { where: { ativo: 1 }, select: { id: true, data: true } } },
      orderBy: { nome: 'asc' }
    });

    const nowSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const trilhas = trilhasRaw.map((t: any) => {
      const items = Array.isArray(t.itens) ? t.itens : [];
      const total = items.length;
      let completed = 0;
      for (const it of items) {
        if (!it?.data) continue;
        const itSP = toDateInSaoPaulo(it.data);
        if (!itSP) continue;
        if (itSP.getTime() < nowSP.getTime()) completed++;
      }
      const progresso = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { id: t.id, nome: t.nome, progresso };
    });

    // 4) Agendamentos (próximos 5) — apenas itens de trilhas vinculadas à empresa
    const hoje = new Date();
    const agendRaw = await prisma.trilhaItem.findMany({
      where: { ativo: 1, data: { gte: hoje }, trilha: { empresas: { some: { idEmpresa: empresaId } } } },
      select: { id: true, tipo: true, nome: true, data: true },
      orderBy: { data: 'asc' },
      take: 5
    });

    const agendamentos = agendRaw.map((it: any) => {
      const rawIso = it.data ? (it.data instanceof Date ? it.data.toISOString() : new Date(it.data).toISOString()) : null;
      return { id: it.id, tipo: it.tipo || 'Evento', nome: it.nome, data: it.data ? formatDateToBrazil(it.data) : '', horario: it.data ? formatTimeToBrazil(it.data) : '', dataRaw: rawIso };
    });

    return NextResponse.json({ empresas: [], escalas, modulos, trilhas, agendamentos });
  } catch (err) {
    console.error('Erro na API client/dashboard', err);
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 });
  }
}
