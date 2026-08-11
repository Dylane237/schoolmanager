export type AdminLicence = {
  id: string
  cle_licence: string
  type: string
  date_debut: string
  date_fin: string
  is_active: number | boolean
  created_at: string
  ecole_id: string | null
  ecoles?: { nom: string; slug?: string } | null
  ecole_slug?: string | null
  ecole_nom?: string | null
  directeur_nom?: string | null
  telephone?: string | null
  parrain_code?: string | null
  activated_at?: string | null
}

export const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  standard: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  premium: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
}

export const PLAN_PRICES: Record<string, number> = {
  starter: 150_000,
  standard: 350_000,
  premium: 650_000,
}

export const PLAN_HINTS: Record<string, string> = {
  starter: "Jusqu'à 150 élèves",
  standard: "Jusqu'à 400 élèves",
  premium: 'Élèves illimités',
}

const LICENCE_KEY_RE = /^[A-Z]+-POOL-\d{4}-[A-F0-9]{8}$/i

export function looksLikeLicenceKey(value: string | null | undefined): boolean {
  if (!value) return false
  return LICENCE_KEY_RE.test(value.trim())
}

function slugToLabel(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function resolveEcoleSlug(l: AdminLicence): string | null {
  const candidates = [l.ecole_slug, l.ecoles?.slug, l.ecole_id]
  for (const c of candidates) {
    if (!c || looksLikeLicenceKey(c) || /^[0-9a-f-]{36}$/i.test(c)) continue
    return c
  }
  return null
}

export function resolveEcoleNom(l: AdminLicence): string | null {
  const candidates = [l.ecole_nom, l.ecoles?.nom]
  for (const c of candidates) {
    if (c && !looksLikeLicenceKey(c)) return c
  }
  const slug = resolveEcoleSlug(l)
  if (slug) return slugToLabel(slug)
  return null
}

export function isLicenceAssigned(l: AdminLicence): boolean {
  return !!(l.ecole_id || l.ecole_nom || l.ecole_slug || l.ecoles || l.activated_at)
}

export function hasSchoolName(l: AdminLicence): boolean {
  return !!(l.ecole_nom || l.ecoles?.nom)
}

export function ecoleDisplayName(l: AdminLicence): string | null {
  return resolveEcoleNom(l)
}

export function ecoleSlug(l: AdminLicence): string | null {
  return resolveEcoleSlug(l)
}

export function schoolInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function licenceStatus(l: AdminLicence): {
  label: string
  tone: 'success' | 'warning' | 'danger' | 'neutral'
  daysLeft: number
} {
  const active = !!l.is_active
  const daysLeft = Math.floor((new Date(l.date_fin).getTime() - Date.now()) / 86_400_000)
  if (!active) return { label: 'Révoquée', tone: 'danger', daysLeft }
  if (daysLeft < 0) return { label: 'Expirée', tone: 'danger', daysLeft }
  if (daysLeft <= 30) return { label: `${daysLeft}j restants`, tone: 'warning', daysLeft }
  return { label: 'Active', tone: 'success', daysLeft }
}

export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

export function defaultLicenceEndDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}
