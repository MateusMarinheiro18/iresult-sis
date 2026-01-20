import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'logos');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = Number(id);

    if (!companyId || Number.isNaN(companyId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Buscar empresa para obter logoFileName
    const company = await prisma.empresa.findUnique({
      where: { id: companyId },
      select: { logoFileName: true }
    });

    if (!company || !company.logoFileName) {
      return NextResponse.json({ error: 'Logo não encontrado' }, { status: 404 });
    }

    // Caminho do arquivo em public/uploads/logos
    const filePath = path.join(UPLOAD_DIR, company.logoFileName);

    // Verificar se arquivo existe
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    // Ler arquivo
    const fileBuffer = await fs.readFile(filePath);

    // Determinar content-type baseado na extensão
    const ext = path.extname(company.logoFileName).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Retornar imagem
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (err) {
    console.error('Erro ao servir logo da empresa:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
