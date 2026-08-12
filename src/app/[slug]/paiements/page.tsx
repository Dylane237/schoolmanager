'use client'

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, TrendingUp, AlertCircle, Calendar, Clock, History, Users, Pencil, Printer, X, CreditCard } from 'lucide-react'
import { useTranslations } from 'next-intl'
import PageShell from '@/components/layout/PageShell'
import EmptyState from '@/components/ui/EmptyState'
import SituationParEleve from '@/components/paiements/SituationParEleve'
import RecuPrint from '@/components/paiements/RecuPrint'
import SmartFilterBar from '@/components/filters/SmartFilterBar'
import StudentContextBanner from '@/components/students/StudentContextBanner'
import { useSmartFilters } from '@/hooks/useSmartFilters'
import { useStudentDeepLink } from '@/hooks/useStudentDeepLink'
import { useClasses } from '@/hooks/useClasses'
import {
  useTranslatedEnums,
  useSituationStatutOptions,
  usePaymentMethodOptions,
  usePaymentFilters,
} from '@/hooks/useTranslatedEnums'
import { studentLinks } from '@/lib/student-context-links'
import type { EleveSituation } from '@/lib/paiements-utils'
import toast from 'react-hot-toast'

interface Paiement {
  id: string
  eleve_id: string
  recu_numero: string
  eleve_nom: string
  eleve_prenom: string
  numero_matricule: string
  classe_nom: string
  montant: number
  tranche_numero: number
  mode_paiement: string
  date_paiement: string
}

interface Retard {
  eleve_id: string
  nom: string
  prenom: string
  numero_matricule: string
  classe_nom: string
  tranche_numero: number
  montant_attendu: number
  montant_paye: number
  date_limite: string
  jours_retard: number
}

interface Stats {
  today: number
  mois: number
  impaye: number
  retards: number
  retardsCritiques: number
}

type Tab = 'situation' | 'historique'

function PaiementsPageContent() {
  const { slug } = useParams()
  const router = useRouter()
  const { classes } = useClasses()
  const t = useTranslations('paiements')
  const tc = useTranslations('common')
  const te = useTranslatedEnums()
  const situationStatutOptions = useSituationStatutOptions()
  const paymentMethodOptions = usePaymentMethodOptions()
  const paymentFilters = usePaymentFilters()

  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [situations, setSituations] = useState<EleveSituation[]>([])
  const [retards, setRetards] = useState<Retard[]>([])
  const [stats, setStats] = useState<Stats>({ today: 0, mois: 0, impaye: 0, retards: 0, retardsCritiques: 0 })
  const [loading, setLoading] = useState(true)
  const [anneeScolaire, setAnneeScolaire] = useState('')

  const [editPaiement, setEditPaiement] = useState<Paiement | null>(null)
  const [editForm, setEditForm] = useState({
    montant: '', tranche_numero: '1',
    mode_paiement: 'especes', date_paiement: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [recuAReimprimer, setRecuAReimprimer] = useState<{ id: string; recu_numero: string } | null>(null)

  const classeOptions = useMemo(() => [
    { value: '', label: t('list.allClasses') },
    ...classes.map(c => ({ value: c.id, label: c.nom })),
  ], [classes, t])

  const defaultMois = useMemo(() => new Date().toISOString().slice(0, 7), [])

  const filterFields = useMemo(() => [
    { key: 'tab', type: 'select' as const, defaultValue: 'situation' },
    { key: 'q', type: 'search' as const, placeholder: t('list.searchPlaceholder'), debounce: true },
    { key: 'classe', type: 'select' as const, label: t('list.filterLabels.class'), options: classeOptions, defaultValue: '' },
    { key: 'statut', type: 'select' as const, label: t('list.filterLabels.situation'), options: situationStatutOptions, defaultValue: 'tous' },
    { key: 'mois', type: 'month' as const, label: t('list.filterLabels.month'), defaultValue: defaultMois },
    { key: 'mode', type: 'select' as const, label: t('list.filterLabels.method'), options: paymentMethodOptions, defaultValue: '' },
  ], [classeOptions, defaultMois, situationStatutOptions, paymentMethodOptions, t])

  const filters = useSmartFilters(filterFields)
  const { student } = useStudentDeepLink(filters.setFilters)
  const tab = (filters.values.tab || 'situation') as Tab

  const activeFields = useMemo(() => {
    if (tab === 'situation') {
      return filterFields.filter(f => ['q', 'classe', 'statut'].includes(f.key))
    }
    return filterFields.filter(f => ['mois', 'q', 'classe', 'mode'].includes(f.key))
  }, [tab, filterFields])

  const visibleActiveFilters = useMemo(
    () => filters.activeFilters.filter(af => activeFields.some(f => f.key === af.key)),
    [filters.activeFilters, activeFields]
  )

  const overdueColumns = useMemo(() => [
    t('list.columns.student'),
    t('list.columns.class'),
    t('list.columns.installment'),
    t('list.columns.remainingDue'),
    t('list.columns.dueDate'),
    t('list.columns.delay'),
  ], [t])

  const historyColumns = useMemo(() => [
    t('list.columns.receipt'),
    t('list.columns.student'),
    t('list.columns.class'),
    t('list.columns.installment'),
    t('list.columns.amount'),
    t('list.columns.method'),
    t('list.columns.date'),
    t('list.columns.actions'),
  ], [t])

  const editPaymentMethods = useMemo(
    () => paymentMethodOptions.filter(o => o.value !== ''),
    [paymentMethodOptions]
  )

  const fetchHistorique = useCallback(async () => {
    const v = filters.debouncedValues
    const params = new URLSearchParams()
    params.set('mois', v.mois || defaultMois)
    if (v.q) params.set('search', v.q)
    if (v.classe) params.set('classe_id', v.classe)
    if (v.mode) params.set('mode', v.mode)
    const res = await fetch(`/api/paiements?${params}`)
    const data = await res.json()
    setPaiements(data.paiements || [])
    setStats(data.stats || { today: 0, mois: 0, impaye: 0, retards: 0, retardsCritiques: 0 })
    setRetards(data.retards || [])
  }, [filters.debouncedValues, defaultMois])

  const fetchSituation = useCallback(async () => {
    const v = filters.debouncedValues
    const params = new URLSearchParams({ view: 'situation' })
    if (v.q) params.set('search', v.q)
    if (v.classe) params.set('classe_id', v.classe)
    if (v.statut && v.statut !== 'tous') params.set('statut', v.statut)
    const res = await fetch(`/api/paiements?${params}`)
    const data = await res.json()
    setSituations(data.situations || [])
    setAnneeScolaire(data.annee_scolaire || '')
  }, [filters.debouncedValues])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchHistorique(), fetchSituation()]).finally(() => setLoading(false))
  }, [fetchHistorique, fetchSituation])

  const retardsCritiques = retards.filter(r => r.jours_retard >= 3)

  const openEdit = (p: Paiement) => {
    setEditPaiement(p)
    setEditForm({
      montant: String(p.montant),
      tranche_numero: String(p.tranche_numero),
      mode_paiement: p.mode_paiement,
      date_paiement: p.date_paiement,
    })
  }

  const handleEdit = async () => {
    if (!editPaiement) return
    if (!editForm.montant || Number(editForm.montant) <= 0) {
      toast.error(t('list.invalidAmount'))
      return
    }
    setSavingEdit(true)
    const res = await fetch('/api/paiements', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editPaiement.id, ...editForm }),
    })
    setSavingEdit(false)
    if (!res.ok) { toast.error(t('list.toasts.editError')); return }
    toast.success(t('list.toasts.edited'))
    setEditPaiement(null)
    fetchHistorique()
    fetchSituation()
  }

  const imprimerRecu = (p: Paiement) => {
    setRecuAReimprimer({ id: p.id, recu_numero: p.recu_numero })
  }

  return (
    <PageShell
      title={t('list.title')}
      subtitle={t('list.subtitle')}
      breadcrumb={t('list.breadcrumb')}
      actions={
        <button onClick={() => router.push(`/${slug}/paiements/nouveau`)}
          className="btn-primary flex items-center gap-2 py-2.5">
          <Plus className="w-5 h-5" /> {t('list.newPayment')}
        </button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-base text-slate-500">{t('list.stats.today')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{Number(stats.today).toLocaleString('fr-FR')} {tc('currency')}</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-base text-slate-500">{t('list.stats.thisMonth')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{Number(stats.mois).toLocaleString('fr-FR')} {tc('currency')}</p>
        </div>
        <div className="card p-6 cursor-pointer hover:border-red-200 transition-colors"
          onClick={() => filters.setFilters({ tab: 'situation', statut: 'impaye' })}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-base text-slate-500">{t('list.stats.unpaid')}</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{t('list.stats.studentsCount', { count: stats.impaye })}</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-base text-slate-500">{t('list.stats.overdue')}</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.retardsCritiques}</p>
        </div>
      </div>

      {retardsCritiques.length > 0 && (
        <div className="card mb-6 overflow-hidden border-amber-200">
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-amber-800 text-base">{t('list.overdueTitle', { count: retardsCritiques.length })}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {overdueColumns.map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-sm font-semibold text-slate-500 uppercase tracking-wide ${i === 3 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {retardsCritiques.map(r => (
                  <tr key={`${r.eleve_id}-${r.tranche_numero}`} className="hover:bg-amber-50/50">
                    <td className="px-4 py-3">
                      <Link href={studentLinks(slug as string, { id: r.eleve_id, nom: r.nom, prenom: r.prenom, numero_matricule: r.numero_matricule }).fiche}
                        className="block hover:text-emerald-700">
                        <p className="font-semibold text-slate-800 text-base">{r.nom} {r.prenom}</p>
                        <p className="text-sm text-slate-400">{r.numero_matricule}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-base text-slate-600">{r.classe_nom}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">{t('list.installment', { num: r.tranche_numero })}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-red-600 text-base text-right tabular-nums whitespace-nowrap">
                      {(r.montant_attendu - r.montant_paye).toLocaleString('fr-FR')} {tc('currency')}
                    </td>
                    <td className="px-4 py-3 text-base text-slate-500">{r.date_limite}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">{t('list.daysLate', { n: r.jours_retard })}</span>
                      <Link href={studentLinks(slug as string, { id: r.eleve_id, nom: r.nom, prenom: r.prenom, numero_matricule: r.numero_matricule }).encaisser}
                        className="block text-xs text-emerald-600 hover:underline font-medium mt-1">
                        {t('list.collectLink')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-6 p-1 bg-slate-100 rounded-xl w-fit">
        <button type="button" onClick={() => filters.setFilter('tab', 'situation')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === 'situation' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}>
          <Users className="w-4 h-4" /> {t('list.tabs.situation')}
        </button>
        <button type="button" onClick={() => filters.setFilter('tab', 'historique')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === 'historique' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}>
          <History className="w-4 h-4" /> {t('list.tabs.history')}
        </button>
      </div>

      {student && (
        <StudentContextBanner slug={slug as string} student={student} className="mb-4" />
      )}

      <SmartFilterBar
        fields={activeFields}
        values={filters.values}
        onChange={filters.setFilter}
        onReset={filters.reset}
        activeFilters={visibleActiveFilters}
        presets={tab === 'situation' ? paymentFilters : undefined}
        onPreset={tab === 'situation' ? filters.applyPreset : undefined}
        resultCount={tab === 'situation' ? situations.length : paiements.length}
        resultLabel={tab === 'situation' ? t('list.resultSituation') : t('list.resultHistory')}
        loading={loading}
        extra={tab === 'situation' && anneeScolaire ? (
          <span className="text-sm text-slate-400 whitespace-nowrap">{t('list.year', { year: anneeScolaire })}</span>
        ) : undefined}
        className="mb-4"
      />

      {tab === 'situation' ? (
        <SituationParEleve slug={slug as string} situations={situations} loading={loading} />
      ) : (
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-base">{tc('loading')}</div>
          ) : paiements.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title={t('list.emptyTitle')}
              description={t('list.emptyDescription')}
              action={
                <Link href={`/${slug}/paiements/nouveau`} className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> {t('list.newPayment')}
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {historyColumns.map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-sm font-semibold text-slate-500 uppercase tracking-wide ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paiements.map((p, i) => (
                    <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                      <td className="px-4 py-3 font-mono text-sm text-slate-500">{p.recu_numero}</td>
                      <td className="px-4 py-3">
                        <Link href={studentLinks(slug as string, { id: p.eleve_id, nom: p.eleve_nom, prenom: p.eleve_prenom, numero_matricule: p.numero_matricule }).fiche}
                          className="block hover:text-emerald-700">
                          <p className="font-semibold text-slate-800 text-base">{p.eleve_nom} {p.eleve_prenom}</p>
                          <p className="text-sm text-slate-400">{p.numero_matricule}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-base text-slate-600">{p.classe_nom || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">{t('list.installment', { num: p.tranche_numero })}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 text-base text-right tabular-nums whitespace-nowrap">{Number(p.montant).toLocaleString('fr-FR')} {tc('currency')}</td>
                      <td className="px-4 py-3 text-base text-slate-600">{te.paymentMethod(p.mode_paiement)}</td>
                      <td className="px-4 py-3 text-base text-slate-500">{p.date_paiement}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button onClick={() => openEdit(p)} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                            <Pencil className="w-3.5 h-3.5" /> {tc('edit')}
                          </button>
                          <button onClick={() => imprimerRecu(p)} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                            <Printer className="w-3.5 h-3.5" /> {t('list.editReceipt')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {editPaiement && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-slate-800">{t('list.editTitle')}</h2>
              <button onClick={() => setEditPaiement(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="text-sm text-slate-500 -mt-2">
                {editPaiement.eleve_nom} {editPaiement.eleve_prenom} — {editPaiement.recu_numero}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('list.amountLabel')}</label>
                <input type="number" value={editForm.montant}
                  onChange={e => setEditForm(p => ({ ...p, montant: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('list.installmentLabel')}</label>
                  <select value={editForm.tranche_numero}
                    onChange={e => setEditForm(p => ({ ...p, tranche_numero: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    {[1, 2, 3].map(n => (
                      <option key={n} value={String(n)}>{t('list.installmentN', { n })}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('list.modeLabel')}</label>
                  <select value={editForm.mode_paiement}
                    onChange={e => setEditForm(p => ({ ...p, mode_paiement: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    {editPaymentMethods.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('list.dateLabel')}</label>
                <input type="date" value={editForm.date_paiement}
                  onChange={e => setEditForm(p => ({ ...p, date_paiement: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditPaiement(null)}
                  className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-lg px-4 py-2.5 text-sm">{tc('cancel')}</button>
                <button onClick={handleEdit} disabled={savingEdit}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg px-4 py-2.5 text-sm disabled:opacity-50">
                  {savingEdit ? tc('saving') : tc('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {recuAReimprimer && (
        <RecuPrint paiementId={recuAReimprimer.id} numero={recuAReimprimer.recu_numero}
          onClose={() => setRecuAReimprimer(null)} />
      )}
    </PageShell>
  )
}

function PaiementsPageFallback() {
  const t = useTranslations('paiements')
  const tc = useTranslations('common')

  return (
    <PageShell title={t('list.title')} breadcrumb={t('list.breadcrumb')}>
      <div className="card p-16 text-center text-slate-400">{tc('loading')}</div>
    </PageShell>
  )
}

export default function PaiementsPage() {
  return (
    <Suspense fallback={<PaiementsPageFallback />}>
      <PaiementsPageContent />
    </Suspense>
  )
}
