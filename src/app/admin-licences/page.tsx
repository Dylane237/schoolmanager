'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Building2, KeyRound, AlertTriangle, TrendingUp } from 'lucide-react'
import { AdminLicencesShell, AdminBadge } from '@/components/admin-licences/AdminShell'
import { SchoolIdentity } from '@/components/admin-licences/SchoolIdentity'
import {
  type AdminLicence,
  PLAN_COLORS,
  PLAN_PRICES,
  isLicenceAssigned,
  hasSchoolName,
  licenceStatus,
  formatDateFr,
} from '@/lib/admin-licences-types'

function StatCard({
  label,
  value,
  hint,
  accent,
  icon: Icon,
}: {
  label: string
  value: string | number
  hint?: string
  accent?: string
  icon?: typeof Building2
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-slate-500">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-slate-600 shrink-0" />}
      </div>
      <p className={`text-2xl font-bold mt-1 ${accent ?? 'text-white'}`}>{value}</p>
      {hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
    </div>
  )
}

function DashboardContent() {
  const [licences, setLicences] = useState<AdminLicence[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin-licences/list')
    if (res.ok) {
      const data = await res.json()
      setLicences(data.licences || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().split('T')[0]
  const actives = licences.filter(l => l.is_active && l.date_fin >= today)
  const attribuees = licences.filter(l => isLicenceAssigned(l))
  const disponibles = licences.filter(l => !isLicenceAssigned(l) && l.is_active && l.date_fin >= today)
  const expirant = actives.filter(l => licenceStatus(l).daysLeft <= 30)
  const sansNom = attribuees.filter(l => !hasSchoolName(l)).length
  const revenu = actives.reduce((s, l) => s + (PLAN_PRICES[l.type] || 0), 0)

  const recentSchools = [...attribuees]
    .sort((a, b) => (b.activated_at || b.created_at).localeCompare(a.activated_at || a.created_at))
    .slice(0, 8)

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Vue globale</h1>
        <p className="text-sm text-slate-500 mt-1">Pilotage licences · établissements · parrainages</p>
      </div>

      {loading ? (
        <p className="text-slate-500">Chargement...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Licences actives" value={actives.length} icon={KeyRound} />
            <StatCard label="Établissements" value={attribuees.length} hint="Clés activées" icon={Building2} />
            <StatCard label="Clés en pool" value={disponibles.length} hint="Disponibles à l'inscription" />
            <StatCard
              label="Expirent sous 30j"
              value={expirant.length}
              accent={expirant.length ? 'text-amber-400' : undefined}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <StatCard
              label="Revenu estimé (actives)"
              value={`${revenu.toLocaleString('fr-FR')} F`}
              accent="text-emerald-400"
              icon={TrendingUp}
            />
            <StatCard label="Total clés" value={licences.length} hint={`${sansNom} sans nom sync.`} />
          </div>

          {sansNom > 0 && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3 text-sm text-amber-100/90 mb-6 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {sansNom} établissement(s) sans nom en cloud — les noms remontent automatiquement quand
                l&apos;école ouvre SchoolManager, ou renseignez-les dans{' '}
                <Link href="/admin-licences/licences" className="text-amber-200 underline">Licences</Link>.
              </span>
            </div>
          )}

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <h2 className="font-semibold text-white text-sm">Établissements récents</h2>
              <Link href="/admin-licences/licences" className="text-xs text-emerald-400 hover:underline">Toutes les licences →</Link>
            </div>
            {recentSchools.length === 0 ? (
              <p className="p-8 text-sm text-slate-500 text-center">Aucune école activée.</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {recentSchools.map(l => {
                  const status = licenceStatus(l)
                  const planClass = PLAN_COLORS[l.type] ?? PLAN_COLORS.standard
                  return (
                    <li key={l.id} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-slate-800/20">
                      <div className="flex-1 min-w-0">
                        <SchoolIdentity licence={l} compact />
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${planClass}`}>{l.type}</span>
                        <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                        <span className="text-xs text-slate-500">{formatDateFr(l.date_fin)}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  )
}

export default function AdminDashboardPage() {
  return (
    <AdminLicencesShell>
      <DashboardContent />
    </AdminLicencesShell>
  )
}
