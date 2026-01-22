// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken, verifyRhToken } from './lib/auth/jwt';

// Forçar Node.js runtime ao invés de Edge Runtime
export const runtime = 'nodejs';

const ADMIN_COOKIE = 'sis_admin_sess';
const RH_COOKIE = 'sis_rh_sess';

// caminhos públicos (prefixos). Mantém compatibilidade com _next, assets e APIs públicas.
const PUBLIC_PREFIXES = [
  '/_next', // assets do Next
  '/favicon.ico',
  '/api/public', // se houver APIs públicas gerais
  '/public', // pasta pública
];

// rotas administrativas públicas (login/forgot/reset)
const ADMIN_PUBLIC = [
  '/admin/login',
  '/admin/forgot',
  '/admin/reset',
  '/api/admins/login',
  '/api/admins/forgot',
  '/api/admins/reset',
];

// rotas RH públicas (login/forgot/reset)
const RH_PUBLIC = [
  '/admin/login',
  '/admin/forgot',
  '/admin/reset',
  '/api/rh/login',
  '/api/rh/forgot',
  '/api/rh/reset',
];

// rotas públicas específicas de cliente
const CLIENT_PUBLIC = [
  '/client/login',
  '/client/forgot',
  '/client/reset',
  '/api/client/login',
  '/api/client/forgot',
  '/api/client/reset',
];

// helper: checa se o pathname começa com algum prefixo da lista
function startsWithAny(pathname: string, list: string[]) {
  for (const p of list) {
    if (pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p)) return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Em produção, permitir explicitamente /uploads e seus recursos estáticos.
  // Isso garante que arquivos em public/uploads/* não sejam interceptados pelo middleware
  // em produção, sem alterar o comportamento em development.
  if (process.env.NODE_ENV === 'production' && (pathname === '/uploads' || pathname.startsWith('/uploads/'))) {
    return NextResponse.next();
  }

  // permitir recursos públicos/estáticos
  if (startsWithAny(pathname, PUBLIC_PREFIXES)) return NextResponse.next();

  // permitir caminhos públicos específicos de admin, rh e client
  if (startsWithAny(pathname, ADMIN_PUBLIC) || startsWithAny(pathname, RH_PUBLIC) || startsWithAny(pathname, CLIENT_PUBLIC)) {
    return NextResponse.next();
  }

  // permitir OPTIONS (CORS preflight) sem autenticação
  if (request.method === 'OPTIONS') return NextResponse.next();

  // ---- PROTEGER ROTAS /admin ----
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    // APIs admin
    const isApi = pathname.startsWith('/api/');
    const token = request.cookies.get(ADMIN_COOKIE)?.value;

    if (!token) {
      if (isApi) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
      }
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    const { ok } = verifyAdminToken(token);
    if (!ok) {
      if (isApi) {
        return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
      }
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    // token válido -> next
    return NextResponse.next();
  }

  // ---- PROTEGER ROTAS /rh ----
  if (pathname === '/rh' || pathname.startsWith('/rh/')) {
    const isApi = pathname.startsWith('/api/');
    const token = request.cookies.get(RH_COOKIE)?.value;

    if (!token) {
      if (isApi) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
      }
      const loginUrl = new URL('/client/login', request.url);
      loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    const { ok } = verifyRhToken(token);
    if (!ok) {
      if (isApi) {
        return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
      }
      const loginUrl = new URL('/client/login', request.url);
      loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    // token válido -> next
    return NextResponse.next();
  }

  // ---- PROTEGER ROTAS /client ----
  if (pathname === '/client' || pathname.startsWith('/client/')) {
    const isApi = pathname.startsWith('/api/');
    const token = request.cookies.get(RH_COOKIE)?.value;

    if (!token) {
      if (isApi) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
      }
      const loginUrl = new URL('/client/login', request.url);
      loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    const { ok } = verifyRhToken(token);
    if (!ok) {
      if (isApi) {
        return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
      }
      const loginUrl = new URL('/client/login', request.url);
      loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }

    // token válido -> next
    return NextResponse.next();
  }

  // para qualquer outro caminho, não interferimos
  return NextResponse.next();
}

export const config = {
  // matcher cobre páginas e APIs /admin, /rh e /client
  matcher: [
    '/admin/:path*',
    '/admin',
    '/rh/:path*',
    '/rh',
    '/client/:path*',
    '/client',
    '/api/admins/:path*',
    '/api/rh/:path*',
    '/api/client/:path*',
  ],
};
