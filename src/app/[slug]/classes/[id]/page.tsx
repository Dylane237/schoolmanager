'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import {
  ArrowLeft, UserCheck, Users, BookOpen, CreditCard,
  ClipboardList, UserPlus, Phone, Mail, ChevronRight,
  Settings, Plus, Trash2, Save, X, Edit2, GraduationCap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageShell from '@/components/layout/PageShell'
import { useSchool } from '@/components/layout/SchoolProvider'
import { canWriteModule } from '@/lib/rbac'
import Badge from '@/components/ui/Badge'
import ClassListActions from '@/components/classes/ClassListActions'
import { useTranslatedEnums } from '@/hooks/useTranslatedEnums'
import { findNiveau } from '@/lib/cameroon-levels'

interface ClasseDetail {
  id: string
  nom: string
  section: string
  niveau: string
  annee_scolaire: string
  capacite_max: number
  nb_eleves: number
  taux_remplissage: number
  enseignant_nom: string | null
  enseignant_prenom: string | null
  enseignant_telephone: string | null
  enseignant_email: string | null
  enseignant_contrat: string | null
  personnel_id: string | null
}

interface Eleve {
  id: string
  nom: string
  prenom: string
  numero_matricule: string
  sexe: string
  total_paye: number
  total_attendu: number
  total_reste: number
  paiement_statut: string
  frais_examen_statut: string | null
  frais_examen_reste: number
}

interface FraisExamen {
  id: string
  label: string
  montant: number
  date_limite: string | null
}

interface Enseignant {
  id: string
  nom: string
  prenom: string | null
}

interface Tranche {
  id?: string
  tranche_numero: number
  montant_attendu: number
  date_limite: string | null
}

const PAIEMENT_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paye: 'success',
  partiel: 'warning',
  impaye: 'danger',
  non_configure: 'neutral',
}

export default function ClasseDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const router = useRouter()
  const locale = useLocale()
  const { userRole } = useSchool()
  const t = useTranslations('classes')
  const tc = useTranslations('common')
  const te = useTranslatedEnums()
  const canConfigPaiements = canWriteModule(userRole, 'paiements')
  const [loading, setLoading] = useState(true)
  const [classe, setClasse] = useState<ClasseDetail | null>(null)
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [matieres, setMatieres] = useState<{ id: string; nom: string }[]>([])
  const [enseignants, setEnseignants] = useState<Enseignant[]>([])
  const [stats, setStats] = useState({ nb_eleves: 0, capacite_max: 60, impayes: 0, nb_matieres: 0 })
  const [annee, setAnnee] = useState('')

  const [tranches, setTranches] = useState<Tranche[]>([])
  const [editingTranches, setEditingTranches] = useState(false)
  const [tranchesDraft, setTranchesDraft] = useState<Tranche[]>([])
  const [savingTranches, setSavingTranches] = useState(false)

  const [editingCapacite, setEditingCapacite] = useState(false)
  const [capaciteDraft, setCapaciteDraft] = useState(60)
  const [savingCapacite, setSavingCapacite] = useState(false)

  const [fraisExamen, setFraisExamen] = useState<FraisExamen | null>(null)
  const [editingFraisExamen, setEditingFraisExamen] = useState(false)
  const [fraisExamenDraft, setFraisExamenDraft] = useState({ label: '', montant: '', date_limite: '' })
  const [savingFraisExamen, setSavingFraisExamen] = useState(false)
  const [fraisExamenImpayes, setFraisExamenImpayes] = useState(0)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR')

  const formatAmount = (amount: number) =>
    `${Number(amount).toLocaleString(locale === 'en' ? 'en-GB' : 'fr-FR')} ${tc('currency')}`

  const paymentLabel = (statut: string) => {
    if (statut === 'paye' || statut === 'partiel' || statut === 'impaye' || statut === 'non_configure') {
      return te.paymentStatus(statut)
    }
    return '—'
  }

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/classes/${id}`)
    if (!res.ok) {
      toast.error(t('detail.toasts.notFound'))
      router.push(`/${slug}/classes`)
      return
    }
    const data = await res.json()
    setClasse(data.classe)
    setEleves(data.eleves || [])
    setMatieres(data.matieres || [])
    setEnseignants(data.enseignants || [])
    setStats(data.stats || {})
    setTranches(data.tranches || [])
    setFraisExamen(data.frais_examen || null)
    setFraisExamenImpayes(data.frais_examen_impayes ?? 0)
    setAnnee(data.annee_scolaire || '')
    setLoading(false)
  }, [id, slug, router, t])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  const assignEnseignant = async (personnelId: string) => {
    const res = await fetch(`/api/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personnel_id: personnelId || null }),
    })
    if (!res.ok) { toast.error(t('detail.toasts.assignError')); return }
    toast.success(t('detail.toasts.teacherUpdated'))
    fetchDetail()
  }

  const startEditTranches = () => {
    const draft = tranches.length > 0
      ? tranches.map(tr => ({ ...tr }))
      : [{ tranche_numero: 1, montant_attendu: 0, date_limite: null }]
    setTranchesDraft(draft)
    setEditingTranches(true)
  }

  const addTranche = () => {
    setTranchesDraft(prev => [
      ...prev,
      { tranche_numero: prev.length + 1, montant_attendu: 0, date_limite: null },
    ])
  }

  const removeTranche = (index: number) => {
    setTranchesDraft(prev =>
      prev.filter((_, i) => i !== index).map((tr, i) => ({ ...tr, tranche_numero: i + 1 }))
    )
  }

  const updateTranche = (index: number, field: keyof Tranche, value: string | number | null) => {
    setTranchesDraft(prev =>
      prev.map((tr, i) => i === index ? { ...tr, [field]: value } : tr)
    )
  }

  const saveTranches = async () => {
    setSavingTranches(true)
    const res = await fetch('/api/tranches-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classe_id: id,
        annee_scolaire: annee,
        tranches: tranchesDraft,
      }),
    })
    setSavingTranches(false)
    if (!res.ok) { toast.error(t('detail.toasts.saveError')); return }
    toast.success(t('detail.toasts.tranchesUpdated'))
    setEditingTranches(false)
    fetchDetail()
  }

  const startEditFraisExamen = () => {
    setFraisExamenDraft({
      label: fraisExamen?.label || t('detail.examFees.defaultLabel'),
      montant: fraisExamen ? String(fraisExamen.montant) : '',
      date_limite: fraisExamen?.date_limite || '',
    })
    setEditingFraisExamen(true)
  }

  const saveFraisExamen = async () => {
    setSavingFraisExamen(true)
    const res = await fetch('/api/frais-examens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classe_id: id,
        annee_scolaire: annee,
        label: fraisExamenDraft.label,
        montant: Number(fraisExamenDraft.montant) || 0,
        date_limite: fraisExamenDraft.date_limite || null,
      }),
    })
    setSavingFraisExamen(false)
    if (!res.ok) { toast.error(t('detail.toasts.saveError')); return }
    toast.success(t('detail.toasts.examFeesSaved'))
    setEditingFraisExamen(false)
    fetchDetail()
  }

  const removeFraisExamen = async () => {
    if (!confirm(t('detail.examFees.confirmDelete'))) return
    const res = await fetch(`/api/frais-examens?classe_id=${id}`, { method: 'DELETE' })
    if (!res.ok) { toast.error(t('detail.toasts.error')); return }
    toast.success(t('detail.toasts.examFeesDeleted'))
    setEditingFraisExamen(false)
    fetchDetail()
  }

  const startEditCapacite = () => {
    setCapaciteDraft(classe?.capacite_max ?? 60)
    setEditingCapacite(true)
  }

  const saveCapacite = async () => {
    if (capaciteDraft < stats.nb_eleves) {
      toast.error(t('detail.toasts.capacityTooLow', { count: stats.nb_eleves }))
      return
    }
    setSavingCapacite(true)
    const res = await fetch(`/api/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capacite_max: capaciteDraft }),
    })
    setSavingCapacite(false)
    if (!res.ok) { toast.error(t('detail.toasts.saveError')); return }
    toast.success(t('detail.toasts.capacityUpdated'))
    setEditingCapacite(false)
    fetchDetail()
  }

  const totalTranches = tranchesDraft.reduce((s, tr) => s + Number(tr.montant_attendu || 0), 0)

  const tableHeaders = [
    t('detail.students.columns.student'),
    t('detail.students.columns.matricule'),
    t('detail.students.columns.payment'),
    ...(fraisExamen ? [t('detail.students.columns.exam')] : []),
    t('detail.students.columns.remainingDue'),
    '',
  ]

  const quickActions = [
    { label: t('detail.quickActions.enroll.label'), desc: t('detail.quickActions.enroll.desc'), href: `/${slug}/eleves/nouveau`, icon: UserPlus, color: 'bg-emerald-100 text-emerald-600' },
    { label: t('detail.quickActions.attendance.label'), desc: t('detail.quickActions.attendance.desc'), href: `/${slug}/presences?classe=${id}`, icon: ClipboardList, color: 'bg-teal-100 text-teal-600' },
    { label: t('detail.quickActions.grades.label'), desc: t('detail.quickActions.grades.desc'), href: `/${slug}/notes/saisie?classe=${id}`, icon: BookOpen, color: 'bg-violet-100 text-violet-600' },
    { label: t('detail.quickActions.payments.label'), desc: t('detail.quickActions.payments.desc'), href: `/${slug}/paiements?tab=situation&classe=${id}`, icon: CreditCard, color: 'bg-amber-100 text-amber-600' },
  ]

  if (loading || !classe) {
    return (
      <PageShell title={t('detail.breadcrumb')} breadcrumb={t('detail.loadingBreadcrumb')} subtitle="">
        <div className="card p-16 text-center text-slate-400">{tc('loading')}</div>
      </PageShell>
    )
  }

  const niveauRef = findNiveau(classe.section as 'francophone' | 'anglophone' | 'maternelle', classe.niveau || classe.nom)
  const plein = stats.nb_eleves >= stats.capacite_max

  return (
    <PageShell
      title={classe.nom}
      subtitle={`${te.section(classe.section)} · ${classe.annee_scolaire}${niveauRef ? ` · ${niveauRef.label}` : ''}`}
      breadcrumb={classe.nom}
      actions={
        <Link href={`/${slug}/classes`} className="btn-secondary flex items-center gap-2 py-2.5">
          <ArrowLeft className="w-4 h-4" /> {tc('back')}
        </Link>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('detail.stats.studentsEnrolled'), value: stats.nb_eleves, sub: t('detail.stats.placesSub', { max: stats.capacite_max }), color: 'text-slate-800' },
          { label: t('detail.stats.fillRate'), value: `${classe.taux_remplissage}%`, sub: plein ? t('list.full') : t('detail.available'), color: plein ? 'text-red-600' : 'text-emerald-600' },
          { label: t('detail.stats.subjects'), value: stats.nb_matieres, sub: t('detail.configured'), color: 'text-slate-800' },
          { label: t('detail.stats.unpaid'), value: stats.impayes, sub: t('detail.stats.studentsSub'), color: stats.impayes > 0 ? 'text-red-600' : 'text-emerald-600' },
        ].map((s, i) => (
          <div key={i} className="card p-5">
            <p className="text-sm text-slate-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-800">{t('detail.titularTeacher')}</h2>
          </div>
          {classe.enseignant_nom ? (
            <div className="mb-4">
              <p className="font-bold text-lg text-slate-800">
                {classe.enseignant_nom} {classe.enseignant_prenom ?? ''}
              </p>
              {classe.enseignant_contrat && (
                <Badge variant="neutral" size="sm">{te.contractType(classe.enseignant_contrat)}</Badge>
              )}
              <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                {classe.enseignant_telephone && (
                  <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{classe.enseignant_telephone}</p>
                )}
                {classe.enseignant_email && (
                  <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" />{classe.enseignant_email}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm mb-4">{t('detail.noTeacher')}</p>
          )}
          <select
            value={classe.personnel_id || ''}
            onChange={e => assignEnseignant(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">{t('detail.chooseTeacher')}</option>
            {enseignants.map(en => (
              <option key={en.id} value={en.id}>{en.nom}{en.prenom ? ` ${en.prenom}` : ''}</option>
            ))}
          </select>
          <Link href={`/${slug}/personnel`} className="text-xs text-emerald-600 hover:underline mt-2 inline-block">
            {t('detail.manageStaff')}
          </Link>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h2 className="font-semibold text-slate-800 mb-4">{t('detail.quickActions.title')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map(a => (
              <Link key={a.href} href={a.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-sm transition-all text-center group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.color}`}>
                  <a.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800 group-hover:text-emerald-600">{a.label}</span>
                <span className="text-xs text-slate-400">{a.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-slate-800">{t('detail.installments.title')}</h2>
            <span className="text-xs text-slate-400">· {annee}</span>
          </div>
          {!editingTranches && canConfigPaiements && (
            <button onClick={startEditTranches} className="btn-secondary flex items-center gap-2 text-sm py-2 px-3">
              <Settings className="w-4 h-4" />
              {tranches.length > 0 ? tc('edit') : tc('configure')}
            </button>
          )}
        </div>

        {!editingTranches ? (
          tranches.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{t('detail.installments.empty')}</p>
              {canConfigPaiements && (
              <button onClick={startEditTranches} className="mt-3 text-sm text-emerald-600 hover:underline font-medium">
                {t('detail.installments.configure')}
              </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {tranches.map(tr => (
                <div key={tr.tranche_numero} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                      {tr.tranche_numero}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{t('detail.installments.installment', { n: tr.tranche_numero })}</span>
                    {tr.date_limite && (
                      <span className="text-xs text-slate-400">{t('detail.installments.beforeDate', { date: formatDate(tr.date_limite) })}</span>
                    )}
                  </div>
                  <span className="font-semibold text-slate-800">
                    {formatAmount(Number(tr.montant_attendu))}
                  </span>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-800">
                  {t('detail.installments.total')} {formatAmount(tranches.reduce((s, tr) => s + Number(tr.montant_attendu), 0))}
                </span>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {tranchesDraft.map((tr, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">{t('detail.installments.amount')}</label>
                    <input
                      type="number"
                      min="0"
                      value={tr.montant_attendu || ''}
                      onChange={e => updateTranche(i, 'montant_attendu', Number(e.target.value))}
                      className="input-field text-sm"
                      placeholder={t('detail.installments.amountPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">{t('detail.installments.dueDate')}</label>
                    <input
                      type="date"
                      value={tr.date_limite || ''}
                      onChange={e => updateTranche(i, 'date_limite', e.target.value || null)}
                      className="input-field text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeTranche(i)}
                  disabled={tranchesDraft.length === 1}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <div className="flex justify-end px-3 py-2 bg-amber-50 rounded-lg">
              <span className="text-sm font-bold text-amber-800">
                {t('detail.installments.total')} {formatAmount(totalTranches)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button onClick={addTranche} className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                <Plus className="w-4 h-4" /> {t('detail.installments.add')}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingTranches(false)}
                  className="btn-secondary flex items-center gap-2 text-sm py-2 px-3"
                >
                  <X className="w-4 h-4" /> {tc('cancel')}
                </button>
                <button
                  onClick={saveTranches}
                  disabled={savingTranches}
                  className="btn-primary flex items-center gap-2 text-sm py-2 px-3"
                >
                  <Save className="w-4 h-4" />
                  {savingTranches ? tc('saving') : tc('save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-violet-500" />
            <h2 className="font-semibold text-slate-800">{t('detail.examFees.title')}</h2>
            <span className="text-xs text-slate-400">· {annee}</span>
            {fraisExamen && fraisExamenImpayes > 0 && (
              <Badge variant="warning" size="sm">{t('detail.examFees.unpaidCount', { count: fraisExamenImpayes })}</Badge>
            )}
          </div>
          {!editingFraisExamen && canConfigPaiements && (
            <button onClick={startEditFraisExamen} className="btn-secondary flex items-center gap-2 text-sm py-2 px-3">
              <Settings className="w-4 h-4" />
              {fraisExamen ? tc('edit') : tc('configure')}
            </button>
          )}
        </div>

        {!editingFraisExamen ? (
          !fraisExamen ? (
            <div className="text-center py-8 text-slate-400">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{t('detail.examFees.empty')}</p>
              <p className="text-xs mt-1">{t('detail.examFees.emptyHint')}</p>
              {canConfigPaiements && (
              <button onClick={startEditFraisExamen} className="mt-3 text-sm text-emerald-600 hover:underline font-medium">
                {t('detail.examFees.configureLink')}
              </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-violet-50 rounded-xl border border-violet-100">
              <div>
                <p className="font-semibold text-slate-800">{fraisExamen.label}</p>
                {fraisExamen.date_limite && (
                  <p className="text-xs text-slate-500 mt-1">
                    {t('detail.examFees.dueDateLabel', { date: formatDate(fraisExamen.date_limite) })}
                  </p>
                )}
              </div>
              <span className="font-bold text-violet-700 text-lg">
                {formatAmount(Number(fraisExamen.montant))}
              </span>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">{t('detail.examFees.label')}</label>
              <input
                type="text"
                value={fraisExamenDraft.label}
                onChange={e => setFraisExamenDraft(d => ({ ...d, label: e.target.value }))}
                className="input-field text-sm"
                placeholder={t('detail.examFees.labelPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t('detail.examFees.amount')}</label>
                <input
                  type="number"
                  min="0"
                  value={fraisExamenDraft.montant}
                  onChange={e => setFraisExamenDraft(d => ({ ...d, montant: e.target.value }))}
                  className="input-field text-sm"
                  placeholder={t('detail.examFees.amountPlaceholder')}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">{t('detail.examFees.dueDate')}</label>
                <input
                  type="date"
                  value={fraisExamenDraft.date_limite}
                  onChange={e => setFraisExamenDraft(d => ({ ...d, date_limite: e.target.value }))}
                  className="input-field text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              {fraisExamen ? (
                <button onClick={removeFraisExamen} className="text-sm text-red-500 hover:text-red-700 font-medium">
                  {tc('delete')}
                </button>
              ) : <span />}
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingFraisExamen(false)} className="btn-secondary flex items-center gap-2 text-sm py-2 px-3">
                  <X className="w-4 h-4" /> {tc('cancel')}
                </button>
                <button
                  onClick={saveFraisExamen}
                  disabled={savingFraisExamen || !fraisExamenDraft.label.trim()}
                  className="btn-primary flex items-center gap-2 text-sm py-2 px-3"
                >
                  <Save className="w-4 h-4" />
                  {savingFraisExamen ? tc('saving') : tc('save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-800">{t('detail.capacity.title')}</h2>
          </div>
          {!editingCapacite && (
            <button onClick={startEditCapacite} className="btn-secondary flex items-center gap-2 text-sm py-2 px-3">
              <Edit2 className="w-4 h-4" /> {tc('edit')}
            </button>
          )}
        </div>

        {!editingCapacite ? (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${plein ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(classe.taux_remplissage, 100)}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-700 shrink-0">
              {t('detail.capacity.studentsRatio', { current: stats.nb_eleves, max: stats.capacite_max })}
            </span>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-slate-500 mb-1 block">{t('detail.capacity.maxStudents')}</label>
              <input
                type="number"
                min={stats.nb_eleves}
                value={capaciteDraft}
                onChange={e => setCapaciteDraft(Number(e.target.value))}
                className="input-field"
              />
              {capaciteDraft < stats.nb_eleves && (
                <p className="text-xs text-red-500 mt-1">
                  {t('detail.capacity.minimum', { n: stats.nb_eleves })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => setEditingCapacite(false)} className="btn-secondary flex items-center gap-2 text-sm py-2 px-3">
                <X className="w-4 h-4" /> {tc('cancel')}
              </button>
              <button
                onClick={saveCapacite}
                disabled={savingCapacite || capaciteDraft < stats.nb_eleves}
                className="btn-primary flex items-center gap-2 text-sm py-2 px-3 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingCapacite ? tc('saving') : tc('save')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-800">{t('detail.students.title', { count: eleves.length })}</h2>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ClassListActions classeId={id} classeNom={classe.nom} onImported={fetchDetail} />
            <Link href={`/${slug}/eleves?classe=${id}`} className="text-sm text-emerald-600 hover:underline font-medium">
              {t('detail.students.viewAll')}
            </Link>
          </div>
        </div>
        {eleves.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="mb-4">{t('detail.students.empty')}</p>
            <Link href={`/${slug}/eleves/nouveau`} className="btn-primary inline-flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> {t('detail.students.enrollStudent')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {tableHeaders.map((h, i, arr) => {
                    const resteIdx = arr.length - 2
                    return (
                      <th key={`${h}-${i}`} className={`px-5 py-3 text-xs font-semibold text-slate-500 uppercase ${i === resteIdx ? 'text-right' : 'text-left'}`}>{h}</th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eleves.map(el => (
                  <tr key={el.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{el.nom} {el.prenom}</p>
                      <p className="text-xs text-slate-400">
                        {el.sexe === 'M' ? t('detail.students.boy') : el.sexe === 'F' ? t('detail.students.girl') : ''}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-slate-500">{el.numero_matricule}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={PAIEMENT_BADGE[el.paiement_statut] ?? 'neutral'} size="sm">
                        {paymentLabel(el.paiement_statut)}
                      </Badge>
                    </td>
                    {fraisExamen && (
                      <td className="px-5 py-3.5">
                        {el.frais_examen_statut ? (
                          <Badge variant={PAIEMENT_BADGE[el.frais_examen_statut] ?? 'neutral'} size="sm">
                            {paymentLabel(el.frais_examen_statut)}
                          </Badge>
                        ) : '—'}
                      </td>
                    )}
                    <td className="px-5 py-3.5 font-semibold text-sm text-right tabular-nums whitespace-nowrap">
                      <span className={el.total_reste > 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {formatAmount(Number(el.total_reste))}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/${slug}/eleves/${el.id}`}
                        className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline font-medium">
                        {t('detail.students.profile')} <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {matieres.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-800">{t('detail.subjects.title', { count: matieres.length })}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {matieres.map(m => (
              <span key={m.id} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                {m.nom}
              </span>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  )
}
