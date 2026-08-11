import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db-server'
import { requireModule } from '@/lib/rbac.server'
import {
  COMMISSION_PCT,
  ensureReferralCode,
  getParrainagesForEcole,
  getReferralStats,
} from '@/lib/referral-utils'
import { syncLeadToCloud, fetchCloudReferrals } from '@/lib/referral-cloud'

function mergeCloudIntoLocal(
  db: ReturnType<typeof getDb>,
  ecoleId: string,
  cloudLeads: Awaited<ReturnType<typeof fetchCloudReferrals>>,
) {
  for (const cloud of cloudLeads) {
    if (cloud.local_id) {
      db.prepare(`
        UPDATE parrainages SET
          statut = ?,
          montant_abonnement = ?,
          commission_montant = ?,
          cloud_id = ?,
          updated_at = datetime('now')
        WHERE id = ? AND parrain_ecole_id = ?
      `).run(
        cloud.statut,
        cloud.montant_abonnement,
        cloud.commission_montant,
        cloud.id,
        cloud.local_id,
        ecoleId,
      )
    } else if (cloud.id) {
      const exists = db.prepare(`
        SELECT id FROM parrainages WHERE cloud_id = ? AND parrain_ecole_id = ?
      `).get(cloud.id, ecoleId)
      if (!exists) {
        const newId = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
        db.prepare(`
          INSERT INTO parrainages (
            id, parrain_ecole_id, contact_nom, contact_ecole, contact_telephone, notes,
            statut, montant_abonnement, commission_pct, commission_montant, cloud_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          newId,
          ecoleId,
          cloud.contact_nom,
          cloud.contact_ecole,
          cloud.contact_telephone,
          cloud.notes,
          cloud.statut,
          cloud.montant_abonnement,
          cloud.commission_pct,
          cloud.commission_montant,
          cloud.id,
        )
      }
    }
  }
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'parametres', 'GET')
  if (denied) return denied

  const db = getDb()
  const ecole = db.prepare(`
    SELECT id, nom, slug, directeur_nom, referral_code FROM ecoles WHERE id = ?
  `).get(user.ecole_id) as {
    id: string
    nom: string
    slug: string
    directeur_nom: string | null
    referral_code: string | null
  }

  const code = ensureReferralCode(db, ecole.id, ecole.slug)

  const cloudLeads = await fetchCloudReferrals(code)
  if (cloudLeads.length > 0) {
    mergeCloudIntoLocal(db, ecole.id, cloudLeads)
  }

  const parrainages = getParrainagesForEcole(db, ecole.id)
  const stats = getReferralStats(parrainages)

  return NextResponse.json({
    code,
    commissionPct: COMMISSION_PCT,
    ecoleNom: ecole.nom,
    directeurNom: ecole.directeur_nom,
    parrainages,
    stats,
    cloudSynced: cloudLeads.length > 0,
  })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'parametres', 'POST')
  if (denied) return denied

  const body = await request.json()
  const contact_nom = String(body.contact_nom ?? '').trim()
  const contact_telephone = String(body.contact_telephone ?? '').trim()
  const contact_ecole = String(body.contact_ecole ?? '').trim() || null
  const notes = String(body.notes ?? '').trim() || null

  if (!contact_nom || !contact_telephone) {
    return NextResponse.json({ error: 'Nom et téléphone du contact requis' }, { status: 400 })
  }

  const db = getDb()
  const ecole = db.prepare(`
    SELECT id, nom, slug, directeur_nom FROM ecoles WHERE id = ?
  `).get(user.ecole_id) as {
    id: string
    nom: string
    slug: string
    directeur_nom: string | null
  }

  const code = ensureReferralCode(db, ecole.id, ecole.slug)

  const localId = crypto.randomUUID().replace(/-/g, '').slice(0, 32)
  db.prepare(`
    INSERT INTO parrainages (id, parrain_ecole_id, contact_nom, contact_ecole, contact_telephone, notes, commission_pct)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(localId, user.ecole_id, contact_nom, contact_ecole, contact_telephone, notes, COMMISSION_PCT)

  const sync = await syncLeadToCloud({
    local_id: localId,
    parrain_code: code,
    parrain_ecole_slug: ecole.slug,
    parrain_ecole_nom: ecole.nom,
    parrain_directeur_nom: ecole.directeur_nom,
    contact_nom,
    contact_ecole,
    contact_telephone,
    notes,
  })

  if (sync.cloud_id) {
    db.prepare('UPDATE parrainages SET cloud_id = ? WHERE id = ?').run(sync.cloud_id, localId)
  }

  const parrainages = getParrainagesForEcole(db, user.ecole_id)

  return NextResponse.json({
    success: true,
    parrainages,
    stats: getReferralStats(parrainages),
    cloudSynced: !!sync.cloud_id,
    cloudError: sync.error,
  })
}
