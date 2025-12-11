import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const moduloIdStr = searchParams.get('moduloId');
    const empresaIdStr = searchParams.get('empresaId');

    if (!moduloIdStr) return NextResponse.json({ error: 'moduloId é obrigatório' }, { status: 400 });
    if (!empresaIdStr) return NextResponse.json({ error: 'empresaId é obrigatório' }, { status: 400 });

    const moduloId = Number(moduloIdStr), empresaId = Number(empresaIdStr);
    if (Number.isNaN(moduloId) || Number.isNaN(empresaId)) return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 });

    const modulo = await prisma.escalaModulo.findUnique({ where: { id: moduloId }, select: {
      valorInicialFavoravel: true, valorFinalFavoravel: true,
      valorInicialIntermediario: true, valorFinalIntermediario: true,
      valorInicialRisco: true, valorFinalRisco: true,
      idEscala: true
    }});
    if (!modulo) return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 });

    // pegar dataEnvio do vínculo escala-empresa (se houver)
    const vinc = await prisma.escalaHasEmpresa.findUnique({
      where: { idEscala_idEmpresa: { idEscala: modulo.idEscala, idEmpresa: empresaId } },
      select: { dataEnvio: true }
    });
    const dataEnvio = vinc?.dataEnvio || null;

    const categoriasRaw = await prisma.escalaCategoria.findMany({
      where: { idModulo: moduloId, ativo: 1 },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' }
    });

    const categoriasPromises = categoriasRaw.map(async (cat: any) => {
      const whereRes: any = { ativo: 1, pergunta: { ativo: 1, idCategoria: cat.id }, idEmpresa: empresaId };
      if (dataEnvio) whereRes.dataResposta = { gte: dataEnvio };

      const respostas = await prisma.respostaFuncionario.findMany({
        where: whereRes,
        select: { respostaPossivel: { select: { valor: true } } }
      });

      const valores: number[] = [];
      respostas.forEach((r: any) => {
        const v = r.respostaPossivel?.valor;
        if (v !== null && v !== undefined) valores.push(Number(v));
      });

      const media = valores.length > 0 ? valores.reduce((s: number, v: number) => s + v, 0) / valores.length : 0;
      let classificacao: any = 'INTERMEDIARIO';
      if (modulo.valorInicialFavoravel != null && modulo.valorFinalFavoravel != null && media >= Number(modulo.valorInicialFavoravel) && media <= Number(modulo.valorFinalFavoravel)) classificacao = 'FAVORAVEL';
      else if (modulo.valorInicialRisco != null && modulo.valorFinalRisco != null && media >= Number(modulo.valorInicialRisco) && media <= Number(modulo.valorFinalRisco)) classificacao = 'RISCO';

      return { id: cat.id, nome: cat.nome, media: Number(media.toFixed(2)), classificacao };
    });

    const categorias = await Promise.all(categoriasPromises);
    return NextResponse.json(categorias);
  } catch (err) {
    console.error('Erro categorias client', err);
    return NextResponse.json({ error: 'Erro ao carregar categorias' }, { status: 500 });
  }
}
