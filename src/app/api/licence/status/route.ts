import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db-server'
import { requireModule } from '@/lib/rbac.server'
import {
  PLAN_LABELS,
  PLAN_PRICES,
  PLAN_STUDENT_LIMITS,
  type LicencePlan,
} from '@/lib/licence-constants'
import { maskLicenceKey } from '@/lib/licence-server'

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'parametres', 'GET')
  if (denied) return denied

  const db = getDb()

  const licence = db.prepare(`
    SELECT id, type, date_debut, date_fin, cle_licence, is_active
    FROM licences
    WHERE ecole_id = ? AND is_active = 1
    ORDER BY date_fin DESC
    LIMIT 1
  `).get(user.ecole_id) as {
    id: string
    type: string
    date_debut: string
    date_fin: string
    cle_licence: string
    is_active: number
  } | undefined

  const studentCount = (db.prepare(
    "SELECT COUNT(*) as count FROM eleves WHERE ecole_id = ? AND statut = 'actif'"
  ).get(user.ecole_id) as { count: number })?.count ?? 0

  if (!licence) {
    return NextResponse.json({
      active: false,
      studentCount,
      studentLimit: null,
      plan: null,
      planLabel: null,
      planPrice: null,
      dateDebut: null,
      dateFin: null,
      daysLeft: null,
      cleMasked: null,
      usagePercent: null,
    })
  }

  const plan = licence.type as LicencePlan
  const limit = plan in PLAN_STUDENT_LIMITS ? PLAN_STUDENT_LIMITS[plan] : null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(licence.date_fin)
  end.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86400000)
  const isExpired = daysLeft < 0 || licence.is_active !== 1

  const usagePercent = limit
    ? Math.min(100, Math.round((studentCount / limit) * 100))
    : null

  return NextResponse.json({
    active: !isExpired,
    plan,
    planLabel: plan in PLAN_LABELS ? PLAN_LABELS[plan] : licence.type,
    planPrice: plan in PLAN_PRICES ? PLAN_PRICES[plan] : null,
    dateDebut: licence.date_debut,
    dateFin: licence.date_fin,
    daysLeft,
    studentCount,
    studentLimit: limit,
    usagePercent,
    cleMasked: maskLicenceKey(licence.cle_licence),
  })
}
