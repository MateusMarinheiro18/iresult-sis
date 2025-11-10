// Config Imports
import { i18n } from '@configs/i18n'

// Util Imports
import { ensurePrefix } from '@/utils/string'

// Check if the url is missing the locale
export const isUrlMissingLocale = (url: string) => {
  return i18n.locales.every(locale => !(url.startsWith(`/${locale}/`) || url === `/${locale}`))
}

export type Locale = 'pt-BR' | 'en'

export const defaultLocale: Locale = 'pt-BR'

export function getLocalizedUrl(path: string, locale?: string | Locale): string {
  // Se não tiver locale ou for vazio, usar o padrão
  if (!locale || locale === '') {
    locale = defaultLocale
  }
  
  // Para simplificar, retornar apenas o path por enquanto
  // Você pode expandir isso depois conforme necessário
  return path
}
