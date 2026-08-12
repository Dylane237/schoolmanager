import type { Locale } from './config'
import frMessages from '../../messages/fr/index'
import enMessages from '../../messages/en/index'

const catalogs: Record<Locale, Record<string, unknown>> = {
  fr: frMessages,
  en: enMessages,
}

export async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  return catalogs[locale]
}
