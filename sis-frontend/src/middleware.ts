// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminToken, verifyRhToken } from './lib/auth/jwt';

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
const publicClientRoutes = [
  '/client/login',
  '/client/forgot',
  '/client/reset',
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

  // permitir recursos públicos/estáticos
  if (startsWithAny(pathname, PUBLIC_PREFIXES)) return NextResponse.next();

  // permitir caminhos públicos específicos de admin e rh
  if (startsWithAny(pathname, ADMIN_PUBLIC) || startsWithAny(pathname, RH_PUBLIC)) return NextResponse.next();

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
  if (pathname.startsWith('/client') && !publicClientRoutes.includes(pathname)) {
    const rhToken = request.cookies.get('sis_rh_sess')?.value;
    if (!rhToken) {
      return NextResponse.redirect(new URL(`/client/login?next=${encodeURIComponent(pathname)}`, request.url));
    }
  }

  // para qualquer outro caminho, não interferimos
  return NextResponse.next();
}

export const config = {
  // matcher cobre páginas e APIs /admin e /rh
  matcher: ['/admin/:path*', '/admin', '/rh/:path*', '/rh', '/api/admins/:path*', '/api/rh/:path*'],
};
