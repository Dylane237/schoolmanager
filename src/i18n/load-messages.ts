import type { Locale } from './config'

const MODULES = [
  'common',
  'language',
  'auth',
  'nav',
  'dashboard',
  'enums',
  'filters',
  'eleves',
  'classes',
  'paiements',
  'notes',
  'presences',
  'maternelle',
  'personnel',
  'annonces',
  'parametres',
  'licence',
  'superAdmin',
  'adminLicences',
  'misc',
  'components',
  'marketing',
] as const

export async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  const entries = await Promise.all(
    MODULES.map(async (name) => {
      const mod = await import(`../../messages/${locale}/${name}.json`)
      return [name, mod.default] as const
    }),
  )
  return Object.fromEntries(entries)
}
