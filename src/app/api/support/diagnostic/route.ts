import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db-server'
import { requireModule } from '@/lib/rbac.server'
import { getSchemaVersion, getRecentAuditLogs } from '@/lib/audit-log'
import { getActiveLicenceType } from '@/lib/licence-limits'
import { licenceDaysLeft, PLAN_LABELS, type LicencePlan } from '@/lib/licence-constants'
import { getDbPath } from '@/lib/paths'

const APP_VERSION = process.env.SM_APP_VERSION ?? '1.0.0'

/** Diagnostic support — réservé admin école (paramètres). */
export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'parametres', 'GET')
  if (denied) return denied

  const db = getDb()
  const ecole = db.prepare('SELECT nom, slug FROM ecoles WHERE id = ?').get(user.ecole_id) as {
    nom: string
    slug: string
  }

  const licence = db.prepare(`
    SELECT type, date_fin, cle_licence, is_active
    FROM licences WHERE ecole_id = ? AND is_active = 1
    ORDER BY date_fin DESC LIMIT 1
  `).get(user.ecole_id) as {
    type: string
    date_fin: string
    cle_licence: string
    is_active: number
  } | undefined

  const studentCount = (db.prepare(
    "SELECT COUNT(*) as c FROM eleves WHERE ecole_id = ? AND statut = 'actif'",
  ).get(user.ecole_id) as { c: number }).c

  const plan = licence?.type as LicencePlan | undefined
  const daysLeft = licence ? licenceDaysLeft(licence.date_fin) : null

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    app: {
      name: 'schoolmanager',
      version: APP_VERSION,
      node_env: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
    },
    ecole: { nom: ecole?.nom, slug: ecole?.slug },
    licence: licence ? {
      plan: licence.type,
      plan_label: plan && plan in PLAN_LABELS ? PLAN_LABELS[plan] : licence.type,
      date_fin: licence.date_fin,
      days_left: daysLeft,
      active: licence.is_active === 1 && daysLeft !== null && daysLeft >= 0,
      cle_masked: `${licence.cle_licence.slice(0, 4)}••••${licence.cle_licence.slice(-4)}`,
    } : null,
    limits: {
      student_count: studentCount,
      active_plan: getActiveLicenceType(db, user.ecole_id),
    },
    database: {
      path: process.env.VERCEL ? null : getDbPath(),
      schema_version: getSchemaVersion(db),
    },
    recent_audit_count: getRecentAuditLogs(db, user.ecole_id, 10).length,
  })
}
