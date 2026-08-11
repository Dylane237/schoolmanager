import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db-server'
import { PLAN_PRICES } from '../../../../lib/licence-constants'

const CLOUD_ADMIN_MSG =
  'La création et révocation de clés pool se fait sur https://schoolmanager-eosin.vercel.app/admin-licences'

/** Lecture seule — licences activées localement sur cette installation. */
export async function GET(request: NextRequest) {
  if (!await requireSuperAdmin(request)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const db = getDb()
  const licences = db.prepare(`
    SELECT l.*, e.nom as ecole_nom, e.slug as ecole_slug
    FROM licences l
    LEFT JOIN ecoles e ON e.id = l.ecole_id
    ORDER BY l.created_at DESC
  `).all()

  const stats = {
    pool: (licences as { ecole_id: string | null; is_active: number }[]).filter(l => !l.ecole_id && l.is_active).length,
    actives: (licences as { is_active: number; date_fin: string }[]).filter(
      l => l.is_active && l.date_fin >= new Date().toISOString().split('T')[0],
    ).length,
  }

  return NextResponse.json({
    licences,
    stats,
    plans: PLAN_PRICES,
    cloud_admin: 'https://schoolmanager-eosin.vercel.app/admin-licences',
    read_only: true,
  })
}

export async function POST() {
  return NextResponse.json(
    { error: CLOUD_ADMIN_MSG, cloud_admin: 'https://schoolmanager-eosin.vercel.app/admin-licences' },
    { status: 410 },
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: CLOUD_ADMIN_MSG, cloud_admin: 'https://schoolmanager-eosin.vercel.app/admin-licences' },
    { status: 410 },
  )
}
