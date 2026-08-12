'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { AdminLicencesShell, AdminBadge, STATUT_COLORS } from '@/components/admin-licences/AdminShell'
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

const REFERRAL_STATUSES = ['en_cours', 'abonnement_actif', 'commission_versee', 'annule'] as const

function EditModal({ p, onClose, onSaved }: { p: Parrainage; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations('adminLicences')
  const tc = useTranslations('common')
  const [statut, setStatut] = useState(p.statut)
  const [montant, setMontant] = useState(p.montant_abonnement?.toString() ?? '')
  const [commission, setCommission] = useState(p.commission_montant?.toString() ?? '')
  const [filleulNom, setFilleulNom] = useState(p.filleul_ecole_nom ?? p.contact_ecole ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30'

  const referralStatusLabel = (status: string) => {
    if (REFERRAL_STATUSES.includes(status as typeof REFERRAL_STATUSES[number])) {
      return t(`referrals.status.${status}` as 'referrals.status.en_cours')
    }
    return status
  }

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
    if (!res.ok) { setError(data.error || tc('errorLoad')); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white">{p.contact_nom}</h3>
        <p className="text-xs text-slate-500 mb-5">
          {t('referrals.referralOf', { code: p.parrain_code, school: p.parrain_ecole_nom })}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('referrals.fields.status')}</label>
            <select value={statut} onChange={e => setStatut(e.target.value)} className={inputClass}>
              {REFERRAL_STATUSES.map(k => (
                <option key={k} value={k}>{referralStatusLabel(k)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('referrals.fields.subscriptionAmount')}</label>
            <input type="number" value={montant} onChange={e => setMontant(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('referrals.fields.commissionPaid')}</label>
            <input type="number" value={commission} onChange={e => setCommission(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">{t('referrals.fields.referralSchool')}</label>
            <input value={filleulNom} onChange={e => setFilleulNom(e.target.value)} className={inputClass} />
          </div>
        </div>
        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm">{tc('cancel')}</button>
          <button type="button" onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-50">
            {saving ? tc('saving') : tc('save')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ParrainagesContent() {
  const t = useTranslations('adminLicences')
  const tc = useTranslations('common')
  const [parrainages, setParrainages] = useState<Parrainage[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [edit, setEdit] = useState<Parrainage | null>(null)
  const [configError, setConfigError] = useState('')

  const referralStatusLabel = (status: string) => {
    if (REFERRAL_STATUSES.includes(status as typeof REFERRAL_STATUSES[number])) {
      return t(`referrals.status.${status}` as 'referrals.status.en_cours')
    }
    return status
  }

  const load = useCallback(async () => {
    setLoading(true)
    setConfigError('')
    const url = filter ? `/api/admin-licences/parrainages?statut=${filter}` : '/api/admin-licences/parrainages'
    const res = await fetch(url)
    const data = await res.json()
    if (res.status === 503) {
      setConfigError(t('referrals.configError'))
      setLoading(false)
      return
    }
    if (res.ok) {
      setParrainages(data.parrainages ?? [])
      setStats(data.stats ?? null)
    }
    setLoading(false)
  }, [filter, t])

  useEffect(() => { load() }, [load])

  const statCards = stats ? [
    { label: t('referrals.stats.inProgress'), value: stats.enCours },
    { label: t('referrals.stats.active'), value: stats.actifs },
    { label: t('referrals.stats.paid'), value: stats.verses },
    { label: t('referrals.stats.totalPaid'), value: stats.totalCommission > 0 ? stats.totalCommission.toLocaleString('fr-FR') : '—' },
  ] : []

  const filterOptions = ['', ...REFERRAL_STATUSES] as const

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t('referrals.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('referrals.subtitle')}</p>
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
        {filterOptions.map(s => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              filter === s ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-800 text-slate-500'
            }`}
          >
            {s ? referralStatusLabel(s) : t('referrals.all')}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-slate-500 py-16">{tc('loading')}</p>
      ) : parrainages.length === 0 ? (
        <p className="text-center text-slate-500 py-16">{t('referrals.empty')}</p>
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
                  <AdminBadge tone={STATUT_COLORS[p.statut] ?? 'neutral'}>{referralStatusLabel(p.statut)}</AdminBadge>
                  <button type="button" onClick={() => setEdit(p)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700">
                    {t('referrals.manage')}
                  </button>
                </div>
              </div>
              {(p.montant_abonnement != null || p.commission_montant != null) && (
                <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-800 text-sm">
                  {p.montant_abonnement != null && (
                    <span className="text-slate-400">
                      {t('referrals.subscription')} : <strong className="text-white tabular-nums">{Number(p.montant_abonnement).toLocaleString('fr-FR')} F</strong>
                    </span>
                  )}
                  {p.commission_montant != null && (
                    <span className="text-violet-400">
                      {t('referrals.commission')} : <strong className="tabular-nums">{Number(p.commission_montant).toLocaleString('fr-FR')} F</strong>
                    </span>
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
