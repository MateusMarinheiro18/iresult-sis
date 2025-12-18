// src/lib/urlWithCompany.ts
/**
 * urlWithCompany
 * - Recebe um href (relativo ou absoluto) e um companyId (number|null)
 * - Retorna href com o query param `company=<id>` preservado
 *
 * Nota: quando href for relativo (ex.: "/admin/escalas"), tenta construir um URL
 * usando window.location.origin (se disponível) para manipular searchParams,
 * e então retorna um caminho relativo (pathname + search + hash).
 */
export function urlWithCompany(href: string, companyId: number | null | undefined): string {
    if (!companyId) return href;
  
    const companyStr = String(companyId);
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  
    try {
      const u = new URL(href, base);
      u.searchParams.set('company', companyStr);
  
      // Se o href original foi relativo, retorna relativo
      if (href.startsWith('/')) {
        return u.pathname + u.search + u.hash;
      }
  
      // Se foi absoluto, retorna absoluto
      return u.toString();
    } catch (err) {
      const sep = href.includes('?') ? '&' : '?';
      return `${href}${sep}company=${encodeURIComponent(companyStr)}`;
    }
  }
