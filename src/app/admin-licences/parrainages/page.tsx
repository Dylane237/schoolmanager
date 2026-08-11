'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminLicencesShell, AdminBadge, STATUT_LABELS, STATUT_COLORS } from '@/components/admin-licences/AdminShell'
import { formatDateFr } from '@/lib/admin-licences-types'

type Parrainage = {
  id: string
  parrain_code: string
  parrain_ecole_nom: string
  contact_nom: string
  contact_ecole: string | null
  contact_telephone: string
  statut: string
  montant_abonnement: number | null
  commission_montant: number | null
  filleul_ecole_nom: string | null
  created_at: string
}

type Stats = { enCours: number; actifs: number; verses: number; totalCommission: number }

function EditModal({ p, onClose, onSaved }: { p: Parrainage; onClose: () => void; onSaved: () => void }) {
  const [statut, setStatut] = useState(p.statut)
  const [montant, setMontant] = useState(p.montant_abonnement?.toString() ?? '')
  const [commission, setCommission] = useState(p.commission_montant?.toString() ?? '')
  const [filleulNom, setFilleulNom] = useState(p.filleul_ecole_nom ?? p.contact_ecole ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30'

  const save = async () => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin-licences/parrainages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: p.id,
        statut,
        montant_abonnement: montant ? Number(montant) : null,
        commission_montant: commission ? Number(commission) : null,
        filleul_ecole_nom: filleulNom || null,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Erreur'); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white">{p.contact_nom}</h3>
        <p className="text-xs text-slate-500 mb-5">Parrain {p.parrain_code} · {p.parrain_ecole_nom}</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Statut</label>
            <select value={statut} onChange={e => setStatut(e.target.value)} className={inputClass}>
              {Object.entries(STATUT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Montant abonnement (FCFA)</label>
            <input type="number" value={montant} onChange={e => setMontant(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Commission versée (FCFA)</label>
            <input type="number" value={commission} onChange={e => setCommission(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">École filleul</label>
            <input value={filleulNom} onChange={e => setFilleulNom(e.target.value)} className={inputClass} />
          </div>
        </div>
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm">Annuler</button>
          <button type="button" onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ParrainagesContent() {
  const [parrainages, setParrainages] = useState<Parrainage[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [edit, setEdit] = useState<Parrainage | null>(null)
  const [configError, setConfigError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const url = filter ? `/api/admin-licences/parrainages?statut=${filter}` : '/api/admin-licences/parrainages'
    const res = await fetch(url)
    const data = await res.json()
    if (res.status === 503) {
      setConfigError('Supabase non configuré — vérifiez les variables sur Vercel.')
      setLoading(false)
      return
    }
    if (res.ok) {
      setParrainages(data.parrainages ?? [])
      setStats(data.stats ?? null)
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const statCards = stats ? [
    { label: 'En cours', value: stats.enCours },
    { label: 'Actifs', value: stats.actifs },
    { label: 'Versées', value: stats.verses },
    { label: 'FCFA versés', value: stats.totalCommission > 0 ? stats.totalCommission.toLocaleString('fr-FR') : '—' },
  ] : []

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Parrainages</h1>
        <p className="text-sm text-slate-500 mt-1">Leads synchronisés · commissions 10 %</p>
      </div>

      {configError && (
        <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/25 px-4 py-3 text-sm text-red-300">{configError}</div>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {statCards.map(s => (
            <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{s.label}</p>
              <p className="text-xl font-bold text-white mt-1">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {['', 'en_cours', 'abonnement_actif', 'commission_versee', 'annule'].map(s => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              filter === s ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-800 text-slate-500'
            }`}
          >
            {s ? STATUT_LABELS[s] : 'Tous'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-slate-500 py-16">Chargement...</p>
      ) : parrainages.length === 0 ? (
        <p className="text-center text-slate-500 py-16">Aucun parrainage.</p>
      ) : (
        <div className="space-y-3">
          {parrainages.map(p => (
            <article key={p.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-white">{p.contact_nom}</p>
                  {p.contact_ecole && <p className="text-sm text-slate-400">{p.contact_ecole}</p>}
                  <p className="text-xs text-slate-500 mt-1">{p.contact_telephone}</p>
                  <p className="text-xs text-violet-400 font-mono mt-2">{p.parrain_code} · {p.parrain_ecole_nom}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <AdminBadge tone={STATUT_COLORS[p.statut] ?? 'neutral'}>{STATUT_LABELS[p.statut] ?? p.statut}</AdminBadge>
                  <button type="button" onClick={() => setEdit(p)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700">
                    Gérer
                  </button>
                </div>
              </div>
              {(p.montant_abonnement != null || p.commission_montant != null) && (
                <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-800 text-sm">
                  {p.montant_abonnement != null && (
                    <span className="text-slate-400">Abonnement : <strong className="text-white tabular-nums">{Number(p.montant_abonnement).toLocaleString('fr-FR')} F</strong></span>
                  )}
                  {p.commission_montant != null && (
                    <span className="text-violet-400">Commission : <strong className="tabular-nums">{Number(p.commission_montant).toLocaleString('fr-FR')} F</strong></span>
                  )}
                </div>
              )}
              <p className="text-[10px] text-slate-600 mt-2">{formatDateFr(p.created_at)}</p>
            </article>
          ))}
        </div>
      )}

      {edit && <EditModal p={edit} onClose={() => setEdit(null)} onSaved={load} />}
    </>
  )
}

export default function AdminParrainagesPage() {
  return (
    <AdminLicencesShell>
      <ParrainagesContent />
    </AdminLicencesShell>
  )
}
