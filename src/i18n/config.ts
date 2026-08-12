export const locales = ['fr', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'fr'

export const LOCALE_COOKIE = 'sm_locale'

export const localeLabels: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
}

/** BCP 47 tag for Intl formatters. */
export function getIntlLocale(locale: Locale): string {
  return locale === 'en' ? 'en-GB' : 'fr-FR'
}

export function isLocale(value: string | undefined | null): value is Locale {
  return locales.includes(value as Locale)
}
