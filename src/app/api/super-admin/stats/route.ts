import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db-server'
import { PLAN_PRICES, type LicencePlan } from '../../../../lib/licence'

export async function GET(request: NextRequest) {
  if (!await requireSuperAdmin(request)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  const totalEcoles = (db.prepare('SELECT COUNT(*) as count FROM ecoles').get() as { count: number })?.count ?? 0
  const totalEleves = (db.prepare(
    'SELECT COUNT(*) as count FROM eleves WHERE statut = ?'
  ).get('actif') as { count: number })?.count ?? 0

  const licencesActives = (db.prepare(`
    SELECT COUNT(*) as count FROM licences
    WHERE is_active = 1 AND date_fin >= date('now')
  `).get() as { count: number })?.count ?? 0

  const licencesExpirant = (db.prepare(`
    SELECT COUNT(*) as count FROM licences
    WHERE is_active = 1 AND date_fin >= date('now')
    AND date_fin <= date('now', '+30 days')
  `).get() as { count: number })?.count ?? 0

  const licencesExpirees = (db.prepare(`
    SELECT COUNT(*) as count FROM licences
    WHERE is_active = 1 AND date_fin < date('now')
  `).get() as { count: number })?.count ?? 0

  const licencesParPlan = db.prepare(`
    SELECT type, COUNT(*) as count FROM licences
    WHERE is_active = 1 AND date_fin >= date('now')
    GROUP BY type
  `).all() as { type: LicencePlan; count: number }[]

  let chiffreAffaires = 0
  for (const row of licencesParPlan) {
    chiffreAffaires += (PLAN_PRICES[row.type] || 0) * row.count
  }

  const renouvellements30j = db.prepare(`
    SELECT l.*, e.nom as ecole_nom, e.slug as ecole_slug
    FROM licences l
    JOIN ecoles e ON e.id = l.ecole_id
    WHERE l.is_active = 1
    AND l.date_fin >= date('now')
    AND l.date_fin <= date('now', '+30 days')
    ORDER BY l.date_fin ASC
  `).all()

  const nouvellesEcolesMois = (db.prepare(`
    SELECT COUNT(*) as count FROM ecoles
    WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
  `).get() as { count: number })?.count ?? 0

  const tauxConversion = totalEcoles > 0
    ? Math.round((licencesActives / totalEcoles) * 100)
    : 0

  const ecoles = db.prepare(`
    SELECT e.*,
      l.type as licence_type,
      l.date_fin as licence_fin,
      l.is_active as licence_active,
      (SELECT COUNT(*) FROM eleves el WHERE el.ecole_id = e.id AND el.statut = 'actif') as nb_eleves
    FROM ecoles e
    LEFT JOIN licences l ON l.ecole_id = e.id AND l.is_active = 1
    ORDER BY e.created_at DESC
  `).all()

  return NextResponse.json({
    stats: {
      totalEcoles,
      totalEleves,
      licencesActives,
      licencesExpirant,
      licencesExpirees,
      chiffreAffaires,
      nouvellesEcolesMois,
      tauxConversion,
    },
    business: {
      plans: licencesParPlan.map(p => ({
        plan: p.type,
        count: p.count,
        revenu: (PLAN_PRICES[p.type] || 0) * p.count,
      })),
      renouvellements30j,
    },
    ecoles,
  })
}
