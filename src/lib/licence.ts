import 'server-only'
import { createHmac, randomBytes } from 'crypto'
import { getJwtSecret } from './secrets'

export {
  LICENCE_PLANS,
  PLAN_PRICES,
  PLAN_LABELS,
  PLAN_STUDENT_LIMITS,
  type LicencePlan,
} from './licence-constants'

/**
 * Clé d'activation (école pas encore créée)
 * Format : {PLAN}-POOL-{ANNEE}-{HASH8}
 */
export function generatePoolLicenceKey(
  plan: string,
  dateDebut: string,
  dateFin: string
): string {
  const year = new Date(dateDebut).getFullYear()
  const nonce = randomBytes(8).toString('hex')
  const hash = createHmac('sha256', getJwtSecret())
    .update(`pool|${nonce}|${plan.toLowerCase()}|${dateDebut}|${dateFin}`)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase()
  return `${plan.toUpperCase()}-POOL-${year}-${hash}`
}

/**
 * Clé de renouvellement pour école existante
 * Format : {PLAN}-{SLUG4}-{ANNEE}-{HASH6}
 */
export function generateLicenceKey(
  ecoleSlug: string,
  plan: string,
  dateDebut: string
): string {
  const slug4 = ecoleSlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4).padEnd(4, 'X')
  const year = new Date(dateDebut).getFullYear()
  const hash = createHmac('sha256', getJwtSecret())
    .update(`${ecoleSlug}|${plan.toLowerCase()}|${dateDebut}`)
    .digest('hex')
    .slice(0, 6)
    .toUpperCase()
  return `${plan.toUpperCase()}-${slug4}-${year}-${hash}`
}

export function isPoolLicenceKey(cle: string): boolean {
  return cle.toUpperCase().includes('-POOL-')
}
