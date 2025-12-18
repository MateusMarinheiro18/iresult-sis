// src/app/api/admin/companies/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/auth/jwt";

/**
 * GET /api/admin/companies
 * - Autentica admin via cookie 'sis_admin_sess' ou header 'Authorization: Bearer <token>'
 * - Retorna [{ id, name }] apenas com empresas ativo === 1
 * - Aceita query ?q=texto para filtrar por nome (autocomplete)
 * - Limita a 1000 por padrão
 */

function parseCookie(header: string | null, key: string): string | null {
  if (!header) return null;
  const pairs = header.split(";");
  for (const p of pairs) {
    const [k, ...v] = p.split("=");
    if (k?.trim() === key) return decodeURIComponent(v.join("=").trim());
  }
  return null;
}

async function extractAdminPayload(token: string | null) {
  if (!token) return null;
  try {
    const maybe = verifyAdminToken(token);
    if (maybe && typeof (maybe as any).then === "function") {
      const awaited = await maybe;
      if (awaited && (awaited as any).ok !== undefined) return (awaited as any).payload ?? null;
      return awaited ?? null;
    } else {
      if (maybe && (maybe as any).ok !== undefined) return (maybe as any).payload ?? null;
      return maybe ?? null;
    }
  } catch (err) {
    console.error("verifyAdminToken threw:", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie");
    const cookieToken = parseCookie(cookieHeader, "sis_admin_sess");

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const bearerMatch = authHeader ? String(authHeader).match(/^Bearer\s+(.+)$/i) : null;
    const bearerToken = bearerMatch ? bearerMatch[1] : null;

    const token = cookieToken ?? bearerToken ?? null;

    if (!token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const adminPayload = await extractAdminPayload(token);
    if (!adminPayload) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    // query params: q (filtro) e limit
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? undefined;
    const limitRaw = url.searchParams.get("limit");
    const limit = limitRaw ? Math.min(1000, Math.max(1, Number(limitRaw))) : 1000;

    // agora adicionamos ativo: 1 para retornar somente empresas ativas
    const where: any = { ativo: 1 };
    if (q && q.trim()) {
      where.OR = [
        { razaoSocial: { contains: q.trim(), mode: "insensitive" } },
        { email: { contains: q.trim(), mode: "insensitive" } },
      ];
    }

    const empresas = await prisma.empresa.findMany({
      where,
      select: { id: true, razaoSocial: true },
      orderBy: { razaoSocial: "asc" },
      take: limit,
    });

    const result = empresas.map((e) => ({ id: e.id, name: e.razaoSocial ?? `Empresa ${e.id}` }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Erro /api/admin/companies GET:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
