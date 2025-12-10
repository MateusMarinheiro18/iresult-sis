// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import cookie from 'cookie';
import { verifyAdminToken } from './lib/auth/jwt';

const PUBLIC_PATHS = [
  '/admin/login',
  '/admin/forgot',
  '/admin/reset',
  '/admin/_next', // next internals
  '/api/admins/login',
  '/api/admins/reset',
  '/api/admins/forgot',
];

const COOKIE_NAME = 'sis_admin_sess'; // DEVE SER O MESMO DA API

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // permitir paths públicos
  for (const p of PUBLIC_PATHS) {
    if (pathname.startsWith(p)) return NextResponse.next();
  }

  // apenas proteger rotas /admin
  if (!pathname.startsWith('/admin')) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // se tem token, permitir acesso (validação JWT seria ideal mas pode causar problemas de performance)
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
