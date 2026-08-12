import type { Locale } from '../config'
import frMessages from '@/i18n/catalogs/fr'
import enMessages from '@/i18n/catalogs/en'

const catalogs: Record<Locale, Record<string, unknown>> = {
  fr: frMessages,
  en: enMessages,
}

export async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  return catalogs[locale]
}
