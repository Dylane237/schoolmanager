'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AdminLicencesShell, AdminBadge } from '@/components/admin-licences/AdminShell'
import {
  type AdminLicence,
  PLAN_COLORS,
  PLAN_PRICES,
  isLicenceAssigned,
  ecoleDisplayName,
  licenceStatus,
  formatDateFr,
} from '@/lib/admin-licences-types'

function StatCard({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:p-5">
      <p className="text-xs text-slate-500">{label}</p>
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
  const revenu = actives.reduce((s, l) => s + (PLAN_PRICES[l.type] || 0), 0)

  const recentSchools = [...attribuees]
    .sort((a, b) => (b.activated_at || b.created_at).localeCompare(a.activated_at || a.created_at))
    .slice(0, 6)

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Vue globale</h1>
        <p className="text-sm text-slate-500 mt-1">Pilotage licences et établissements</p>
      </div>

      {loading ? (
        <p className="text-slate-500">Chargement...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Licences actives" value={actives.length} />
            <StatCard label="Établissements" value={attribuees.length} hint="Clés activées" />
            <StatCard label="Clés disponibles" value={disponibles.length} />
            <StatCard label="Expirent sous 30j" value={expirant.length} accent={expirant.length ? 'text-amber-400' : undefined} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <StatCard label="Revenu estimé (actives)" value={`${revenu.toLocaleString('fr-FR')} F`} accent="text-emerald-400" />
            <StatCard label="Total clés en pool" value={licences.length} />
          </div>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-white text-sm">Établissements récents</h2>
              <Link href="/admin-licences/licences" className="text-xs text-emerald-400 hover:underline">Voir toutes →</Link>
            </div>
            {recentSchools.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">Aucune école activée pour le moment.</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {recentSchools.map(l => {
                  const status = licenceStatus(l)
                  const planClass = PLAN_COLORS[l.type] ?? PLAN_COLORS.standard
                  return (
                    <li key={l.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{ecoleDisplayName(l)}</p>
                        <code className="text-[10px] text-slate-500 font-mono">{l.cle_licence}</code>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${planClass}`}>{l.type}</span>
                        <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                        <span className="text-xs text-slate-500 hidden sm:inline">{formatDateFr(l.date_fin)}</span>
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
