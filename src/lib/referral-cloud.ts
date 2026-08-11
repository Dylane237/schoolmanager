import { LICENCE_SERVER_URL } from './licence-server'
import type { ParrainageStatut } from './referral-utils'

export interface CloudReferralLead {
  id: string
  local_id: string | null
  parrain_code: string
  contact_nom: string
  contact_ecole: string | null
  contact_telephone: string
  notes: string | null
  statut: ParrainageStatut
  montant_abonnement: number | null
  commission_pct: number
  commission_montant: number | null
  filleul_ecole_slug: string | null
  filleul_ecole_nom: string | null
  created_at: string
  updated_at: string
}

export interface SyncLeadPayload {
  local_id: string
  parrain_code: string
  parrain_ecole_slug: string
  parrain_ecole_nom: string
  parrain_directeur_nom?: string | null
  contact_nom: string
  contact_ecole?: string | null
  contact_telephone: string
  notes?: string | null
}

/** Sync lead vers le serveur cloud (Vercel). Non bloquant si hors ligne. */
export async function syncLeadToCloud(payload: SyncLeadPayload): Promise<{ cloud_id?: string; error?: string }> {
  try {
    const res = await fetch(`${LICENCE_SERVER_URL}/api/referral/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SchoolManager-Desktop/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error || 'Sync cloud échouée' }
    return { cloud_id: data.id }
  } catch {
    return { error: 'Serveur cloud inaccessible' }
  }
}

/** Récupère les statuts parrainage depuis le cloud. */
export async function fetchCloudReferrals(parrainCode: string): Promise<CloudReferralLead[]> {
  try {
    const res = await fetch(
      `${LICENCE_SERVER_URL}/api/referral/status?code=${encodeURIComponent(parrainCode)}`,
      {
        headers: { 'User-Agent': 'SchoolManager-Desktop/1.0' },
        signal: AbortSignal.timeout(8000),
      },
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.parrainages ?? []
  } catch {
    return []
  }
}
