import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../lib/auth'
import { getDb } from '../../../../lib/db-server'
import { requireModule } from '../../../../lib/rbac.server'

const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const JOURS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

function isoDate(d: Date) {
  return d.toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'paiements', 'GET')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'mois'
  const db = getDb()

  let data: { label: string; total: number }[] = []

  if (period === 'jour') {
    // date_paiement n'a pas d'heure (juste YYYY-MM-DD) ; created_at, lui,
    // a un horodatage complet — c'est lui qu'on utilise pour la granularité
    // horaire, en filtrant sur la journée réelle du paiement.
    const today = isoDate(new Date())
    const rows = db.prepare(`
      SELECT strftime('%H', created_at) as heure, COALESCE(SUM(montant), 0) as total
      FROM paiements WHERE ecole_id = ? AND date_paiement = ?
      GROUP BY heure ORDER BY heure ASC
    `).all(user.ecole_id, today) as { heure: string; total: number }[]

    // Heures d'ouverture usuelles (6h-20h) ; ajustez si votre établissement
    // enregistre des paiements en dehors de cette plage.
    data = Array.from({ length: 15 }, (_, i) => {
      const h = i + 6
      const key = String(h).padStart(2, '0')
      const found = rows.find(r => r.heure === key)
      return { label: `${key}h`, total: found?.total ?? 0 }
    })
  }

  else if (period === 'semaine') {
    const rows = db.prepare(`
      SELECT date_paiement as jour, COALESCE(SUM(montant), 0) as total
      FROM paiements WHERE ecole_id = ? AND date_paiement >= date('now', '-6 days')
      GROUP BY jour ORDER BY jour ASC
    `).all(user.ecole_id) as { jour: string; total: number }[]

    data = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      const key = isoDate(d)
      const found = rows.find(r => r.jour === key)
      return { label: JOURS_FR[d.getDay()], total: found?.total ?? 0 }
    })
  }

  else if (period === 'mois') {
    const rows = db.prepare(`
      SELECT date_paiement as jour, COALESCE(SUM(montant), 0) as total
      FROM paiements WHERE ecole_id = ? AND date_paiement >= date('now', 'start of month')
      GROUP BY jour ORDER BY jour ASC
    `).all(user.ecole_id) as { jour: string; total: number }[]

    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    data = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const key = isoDate(new Date(now.getFullYear(), now.getMonth(), day))
      const found = rows.find(r => r.jour === key)
      return { label: String(day), total: found?.total ?? 0 }
    })
  }

  else if (period === 'custom') {
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (!from || !to) {
      return NextResponse.json({ error: 'Dates de début et de fin requises' }, { status: 400 })
    }

    const fromD = new Date(from)
    const toD = new Date(to)
    const diffDays = Math.max(1, Math.round((toD.getTime() - fromD.getTime()) / 86400000) + 1)

    // Granularité adaptative : jour par jour sur une plage courte, semaine
    // par semaine sur une plage moyenne, mois par mois au-delà — sinon un
    // graphique sur plusieurs années avec un point par jour serait illisible.
    if (diffDays <= 31) {
      const rows = db.prepare(`
        SELECT date_paiement as jour, COALESCE(SUM(montant), 0) as total
        FROM paiements WHERE ecole_id = ? AND date_paiement >= ? AND date_paiement <= ?
        GROUP BY jour ORDER BY jour ASC
      `).all(user.ecole_id, from, to) as { jour: string; total: number }[]

      data = Array.from({ length: diffDays }, (_, i) => {
        const d = new Date(fromD); d.setDate(d.getDate() + i)
        const key = isoDate(d)
        const found = rows.find(r => r.jour === key)
        return { label: `${d.getDate()}/${d.getMonth() + 1}`, total: found?.total ?? 0 }
      })
    } else if (diffDays <= 180) {
      const rows = db.prepare(`
        SELECT strftime('%Y-%W', date_paiement) as semaine, COALESCE(SUM(montant), 0) as total
        FROM paiements WHERE ecole_id = ? AND date_paiement >= ? AND date_paiement <= ?
        GROUP BY semaine ORDER BY semaine ASC
      `).all(user.ecole_id, from, to) as { semaine: string; total: number }[]

      data = rows.map(r => ({ label: `S${r.semaine.split('-')[1]}`, total: r.total }))
    } else {
      const rows = db.prepare(`
        SELECT strftime('%Y-%m', date_paiement) as mois, COALESCE(SUM(montant), 0) as total
        FROM paiements WHERE ecole_id = ? AND date_paiement >= ? AND date_paiement <= ?
        GROUP BY mois ORDER BY mois ASC
      `).all(user.ecole_id, from, to) as { mois: string; total: number }[]

      data = rows.map(r => {
        const [y, m] = r.mois.split('-')
        return { label: `${MOIS_FR[parseInt(m, 10) - 1]} ${y.slice(2)}`, total: r.total }
      })
    }
  }

  else {
    return NextResponse.json({ error: 'Période inconnue' }, { status: 400 })
  }

  return NextResponse.json({ data, period })
}
