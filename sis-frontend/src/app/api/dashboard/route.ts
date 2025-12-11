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

/**
 * Converte um Date/ISO em um Date que representa a hora local em America/Sao_Paulo.
 * Técnica: usar toLocaleString com timeZone e criar um novo Date a partir da string resultante.
 * Isso produz uma Date no ambiente Node/Browser que expressa o instante no fuso de SP.
 */
function toDateInSaoPaulo(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dateObj.getTime())) return null;
  // "Normalize" para o horário local de São Paulo como Date
  // (a string gerada representa a data/hora local em SP; recriando Date gera um objeto no fuso local do ambiente,
  // mas como usamos apenas para comparação relativa, isso resolve o deslocamento de dia).
  const asString = dateObj.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  return new Date(asString);
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

    // 2) Escalas + progresso (distinct funcionários por escala/empresa)
    const whereEscala: any = { ativo: 1 };
    if (empresaId) whereEscala.empresas = { some: { idEmpresa: Number(empresaId) } };
    if (escalaId) whereEscala.id = Number(escalaId);

    // buscar escalas com empresas vinculadas e (antiga) respostas — usaremos distinct posteriormente
    const escalasRaw = await prisma.escala.findMany({
      where: whereEscala,
      select: {
        id: true,
        nome: true,
        empresas: {
          where: empresaId ? { idEmpresa: Number(empresaId) } : {},
          select: {
            idEmpresa: true,
            totalDestinatarios: true,
            dataEnvio: true // NOVO: buscar dataEnvio
          }
        }
      },
      orderBy: { nome: 'asc' }
    });

    const escalasPromises = escalasRaw.map(async (escala: any) => {
      // soma totalDestinatarios dos vínculos
      const totalDestinatariosFromLinks = escala.empresas.reduce(
        (s: number, e: { totalDestinatarios: number | null }) => s + (e.totalDestinatarios || 0),
        0
      );

      let totalDestinatarios = totalDestinatariosFromLinks;

      // fallback: se totalDestinatarios === 0, contar funcionários ativos nas empresas vinculadas
      if (totalDestinatarios === 0 && Array.isArray(escala.empresas) && escala.empresas.length > 0) {
        const empresaIds = escala.empresas.map((e: any) => e.idEmpresa).filter(Boolean);
        if (empresaIds.length > 0) {
          totalDestinatarios = await prisma.empresaFuncionario.count({
            where: {
              id_empresa: { in: empresaIds },
              ativo: 1
            }
          });
        }
      }

      // NOVO: pegar a dataEnvio mais recente para filtrar respostas
      let dataEnvioMaisRecente: Date | null = null;
      if (empresaId) {
        const vinculo = escala.empresas.find((e: any) => e.idEmpresa === Number(empresaId));
        dataEnvioMaisRecente = vinculo?.dataEnvio || null;
      } else {
        // Se não há filtro de empresa, pegar a data mais recente entre todas
        const datas = escala.empresas.map((e: any) => e.dataEnvio).filter(Boolean);
        if (datas.length > 0) {
          dataEnvioMaisRecente = new Date(Math.max(...datas.map((d: Date) => d.getTime())));
        }
      }

      // contar distinct idFuncionario nas respostas (filtrando por empresa se fornecida)
      const whereResposta: any = {
        idEscala: escala.id,
        ativo: 1
      };
      if (empresaId) whereResposta.idEmpresa = Number(empresaId);
      
      // NOVO: só contar respostas após dataEnvio
      if (dataEnvioMaisRecente) {
        whereResposta.dataResposta = { gte: dataEnvioMaisRecente };
      }

      const respostasRows = await prisma.respostaFuncionario.findMany({
        where: whereResposta,
        select: { idFuncionario: true }
      });

      const distinctFuncionarioIds = new Set<number>();
      respostasRows.forEach((r: any) => {
        if (r.idFuncionario !== null && r.idFuncionario !== undefined) distinctFuncionarioIds.add(Number(r.idFuncionario));
      });

      const totalRespostas = distinctFuncionarioIds.size;
      const progressoPercentual = totalDestinatarios > 0 ? Math.round((totalRespostas / totalDestinatarios) * 100) : 0;

      return {
        id: escala.id,
        nome: escala.nome,
        totalRespostas,
        totalDestinatarios,
        progressoPercentual
      };
    });

    const escalas = await Promise.all(escalasPromises);

    // 3) Módulos (se houver escala selecionada)
    let modulos: any[] = [];
    if (escalaId) {
      // NOVO: buscar dataEnvio SOMENTE se houver filtro de empresa
      let dataEnvioModulos: Date | null = null;
      
      if (empresaId) {
        const vinculoModulos = await prisma.escalaHasEmpresa.findUnique({
          where: {
            idEscala_idEmpresa: {
              idEscala: Number(escalaId),
              idEmpresa: Number(empresaId)
            }
          },
          select: { dataEnvio: true }
        });
        dataEnvioModulos = vinculoModulos?.dataEnvio || null;
        console.log(`\n🔍 DATA DE ENVIO encontrada: ${dataEnvioModulos ? dataEnvioModulos.toISOString() : 'NULL'}`);
      }

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
          valorFinalRisco: true
        }
      });

      const modulosPromises = modulosRaw.map(async (modulo: any) => {
        const whereRespostas: any = {
          ativo: 1,
          pergunta: {
            ativo: 1,
            idModulo: modulo.id
          }
        };
        
        if (empresaId) whereRespostas.idEmpresa = Number(empresaId);
        if (dataEnvioModulos) {
          whereRespostas.dataResposta = { gte: dataEnvioModulos };
          console.log(`✅ Filtrando respostas >= ${dataEnvioModulos.toISOString()}`);
        } else {
          console.log(`⚠️ Sem filtro de empresa - pegando TODAS as respostas`);
        }

        const respostas = await prisma.respostaFuncionario.findMany({
          where: whereRespostas,
          select: {
            idFuncionario: true,
            dataResposta: true,
            respostaPossivel: {
              select: { valor: true }
            }
          }
        });

        const valores: number[] = [];
        
        console.log(`\n=== MÓDULO: ${modulo.nome} ===`);
        console.log(`Total de respostas encontradas: ${respostas.length}`);
        
        respostas.forEach((resp: any) => {
          const valor = resp.respostaPossivel?.valor;
          const dataResp = resp.dataResposta ? new Date(resp.dataResposta).toISOString() : 'NULL';
          
          console.log(`  - Func ${resp.idFuncionario} | Data: ${dataResp} | Valor: ${valor}`);
          
          if (valor !== null && valor !== undefined) {
            valores.push(Number(valor));
          }
        });

        console.log(`Valores coletados: [${valores.join(', ')}]`);

        const media = valores.length > 0 
          ? valores.reduce((s: number, x: number) => s + x, 0) / valores.length 
          : 0;

        console.log(`Média: ${media.toFixed(2)}\n`);

        let classificacao = 'INTERMEDIARIO';
        const viF = modulo.valorInicialFavoravel; const vfF = modulo.valorFinalFavoravel;
        const viR = modulo.valorInicialRisco; const vfR = modulo.valorFinalRisco;
        if (viF !== null && vfF !== null && media >= Number(viF) && media <= Number(vfF)) classificacao = 'FAVORAVEL';
        else if (viR !== null && vfR !== null && media >= Number(viR) && media <= Number(vfR)) classificacao = 'RISCO';

        return { id: modulo.id, nome: modulo.nome, media: Number(media.toFixed(2)), classificacao };
      });

      modulos = await Promise.all(modulosPromises);
    }

    // 4) Trilhas — calcular progresso com base em itens cuja `data` já passou no fuso de São Paulo
    const whereTrilha: any = { ativo: 1 };
    if (empresaId) whereTrilha.empresas = { some: { idEmpresa: Number(empresaId) } };

    // buscar trilhas junto com os itens (data) para calcular progresso corretamente
    const trilhasRaw = await prisma.trilha.findMany({
      where: whereTrilha,
      select: {
        id: true,
        nome: true,
        itens: {
          where: { ativo: 1 },
          select: { id: true, data: true }
        }
      },
      orderBy: { nome: 'asc' }
    });

    // agora calcule progresso: % de itens com data < agora (no timezone SP)
    const nowSP = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

    const trilhas = trilhasRaw.map((t: any) => {
      const items = Array.isArray(t.itens) ? t.itens : [];
      const totalItems = items.length;

      let completed = 0;
      if (totalItems > 0) {
        for (const it of items) {
          if (!it?.data) continue;
          const itemInSP = toDateInSaoPaulo(it.data);
          if (!itemInSP) continue;
          if (itemInSP.getTime() < nowSP.getTime()) completed++;
        }
      }

      const progresso = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;
      return {
        id: t.id,
        nome: t.nome,
        progresso
      };
    });

    // 5) Agendamentos (próximos 5) — formatamos data/hora p/ SP e enviamos dataRaw
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
      const rawIso = item.data ? (item.data instanceof Date ? item.data.toISOString() : new Date(item.data).toISOString()) : null;
      return {
        id: item.id,
        tipo: item.tipo || 'Evento',
        nome: item.nome,
        data: item.data ? formatDateToBrazil(item.data) : '',
        horario: item.data ? formatTimeToBrazil(item.data) : '',
        dataRaw: rawIso
      };
    });

    return NextResponse.json({ empresas, escalas, modulos, trilhas, agendamentos });
  } catch (error) {
    console.error('Erro no dashboard:', error);
    return NextResponse.json({ error: 'Erro ao carregar dashboard' }, { status: 500 });
  }
}
