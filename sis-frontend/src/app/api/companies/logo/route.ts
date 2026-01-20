import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File | null;
    const empresaId = formData.get('empresaId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    if (!empresaId) {
      return NextResponse.json({ error: 'ID da empresa não informado.' }, { status: 400 });
    }

    // Validações
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido. Use JPG, PNG ou WebP.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 5MB.' },
        { status: 400 }
      );
    }

    // Verifica se a empresa existe
    const empresa = await prisma.empresa.findUnique({
      where: { id: Number(empresaId) },
    });

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 });
    }

    // Gera nome único para o arquivo
    const timestamp = Date.now();
    const ext = path.extname(file.name);
    const fileName = `empresa-${empresaId}-${timestamp}${ext}`;

    // Define o caminho da pasta pública
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'logos');

    // Cria a pasta se não existir
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Converte o arquivo para buffer e salva
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadDir, fileName);

    await writeFile(filePath, buffer);

    // Atualiza o registro no banco
    await prisma.empresa.update({
      where: { id: Number(empresaId) },
      data: { logoFileName: fileName },
    });

    return NextResponse.json({
      success: true,
      fileName,
      url: `/uploads/logos/${fileName}`,
    });
  } catch (err) {
    console.error('Erro ao fazer upload do logo:', err);
    return NextResponse.json({ error: 'Erro ao processar upload.' }, { status: 500 });
  }
}
