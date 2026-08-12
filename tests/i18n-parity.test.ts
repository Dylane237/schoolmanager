import { describe, expect, it } from 'vitest'
import frMessages from '../src/i18n/catalogs/fr'
import enMessages from '../src/i18n/catalogs/en'

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[]
interface JsonObject {
  [key: string]: JsonValue
}

function flattenKeys(obj: JsonObject, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as JsonObject, path))
    } else {
      keys.push(path)
    }
  }
  return keys.sort()
}

/** Namespaces utilisés par des pages critiques — toute clé ajoutée doit exister en FR et EN. */
const STRICT_PARITY_NAMESPACES = ['misc', 'licence', 'auth', 'sync', 'donnees'] as const

describe('i18n catalog parity', () => {
  for (const namespace of STRICT_PARITY_NAMESPACES) {
    it(`${namespace}: fr and en have identical keys`, () => {
      const fr = frMessages[namespace as keyof typeof frMessages] as JsonObject
      const en = enMessages[namespace as keyof typeof enMessages] as JsonObject
      expect(flattenKeys(fr, namespace)).toEqual(flattenKeys(en, namespace))
    })
  }

  it('includes critical licence-expired page keys in both locales', () => {
    const required = [
      'licence.expired.title',
      'licence.expired.subtitle',
      'licence.expired.howToRenew',
      'licence.expired.step1',
      'licence.expired.step2',
      'licence.expired.step3',
      'licence.expired.emailSupport',
      'licence.expired.backToLogin',
      'licence.expired.whatsappMessage',
      'licence.renewForm.alreadyHaveKey',
      'licence.renewForm.activate',
    ]
    const frKeys = new Set(flattenKeys(frMessages as unknown as JsonObject))
    const enKeys = new Set(flattenKeys(enMessages as unknown as JsonObject))
    for (const key of required) {
      expect(frKeys.has(key), `missing fr key: ${key}`).toBe(true)
      expect(enKeys.has(key), `missing en key: ${key}`).toBe(true)
    }
  })
})
