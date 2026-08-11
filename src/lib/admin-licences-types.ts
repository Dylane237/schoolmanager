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
  premium: 600_000,
}

export function isLicenceAssigned(l: AdminLicence): boolean {
  return !!(l.ecole_id || l.ecoles || l.ecole_nom || l.ecole_slug)
}

export function ecoleDisplayName(l: AdminLicence): string | null {
  return l.ecole_nom || l.ecoles?.nom || l.ecole_slug || null
}

export function ecoleSlug(l: AdminLicence): string | null {
  if (l.ecole_slug) return l.ecole_slug
  if (l.ecoles?.slug) return l.ecoles.slug
  if (l.ecole_id && !/^[0-9a-f-]{36}$/i.test(l.ecole_id)) return l.ecole_id
  return null
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
