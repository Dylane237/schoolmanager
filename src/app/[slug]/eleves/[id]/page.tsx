'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  ArrowLeft, User, Phone, MapPin, Calendar, GraduationCap,
  CreditCard, BookOpen, Clock, Edit2, Save, X, Printer,
  ExternalLink, AlertCircle, TrendingUp, Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PhotoUpload from '@/components/eleves/PhotoUpload'
import Badge from '@/components/ui/Badge'
import { formatMoyenne, getNoteMax } from '@/lib/notes-utils'
import { studentLinks } from '@/lib/student-context-links'
import { useTranslatedEnums } from '@/hooks/useTranslatedEnums'

interface Eleve {
  id: string
  numero_matricule: string
  nom: string
  prenom: string
  date_naissance: string
  lieu_naissance: string
  sexe: string
  photo_url: string
  section: string
  statut: string
  statut_annuel: string
  annee_entree: string
  classe_nom: string
  classe_section: string
  classe_id: string
}

interface ClasseOption { id: string; nom: string; section: string }

interface Parent {
  id: string
  nom: string
  prenom: string
  telephone: string
  lien: string
  est_principal: number
}

interface Paiement {
  id: string
  tranche_numero: number
  montant: number
  date_paiement: string
  mode_paiement: string
  recu_numero: string
}

interface Note {
  id: string
  matiere_nom: string
  coefficient: number
  periode: string
  note: number
  appreciation: string
}

interface Presence {
  id: string
  date: string
  statut: string
  note: string
}

interface Situation {
  total_paye: number
  total_attendu: number
  total_reste: number
  statut: string
  tranches: { tranche_numero: number; montant_attendu: number; montant_paye: number; reste: number; statut: string }[]
}

interface FraisExamenSituation {
  config: { id: string; label: string; montant: number; date_limite: string | null } | null
  montant_attendu: number
  montant_paye: number
  reste: number
  statut: string
  date_limite: string | null
  jours_restants: number | null
  en_retard: boolean
}

function calcAge(dateNaissance: string | null): number | null {
  if (!dateNaissance) return null
  const birth = new Date(dateNaissance)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const PAIEMENT_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paye: 'success', partiel: 'warning', impaye: 'danger', non_configure: 'neutral',
}

const ANNUAL_STATUS_OPTIONS = ['admis', 'redoublant', 'en_attente'] as const

export default function FicheElevePage() {
  const { slug, id } = useParams() as { slug: string; id: string }
  const router = useRouter()
  const t = useTranslations('eleves')
  const tc = useTranslations('common')
  const te = useTranslatedEnums()

  const [eleve, setEleve] = useState<Eleve | null>(null)
  const [parents, setParents] = useState<Parent[]>([])
  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [presences, setPresences] = useState<Presence[]>([])
  const [situation, setSituation] = useState<Situation | null>(null)
  const [fraisExamen, setFraisExamen] = useState<FraisExamenSituation | null>(null)
  const [classes, setClasses] = useState<ClasseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'infos' | 'paiements' | 'notes' | 'presences'>('infos')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Eleve>>({})
  const [periodeFiltre, setPeriodeFiltre] = useState('tous')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/eleves/${id}`)
    if (!res.ok) { router.push(`/${slug}/eleves`); return }
    const data = await res.json()
    setEleve(data.eleve)
    setForm(data.eleve)
    setParents(data.parents || [])
    setPaiements(data.paiements || [])
    setNotes(data.notes || [])
    setPresences(data.presences || [])
    setSituation(data.situation || null)
    setFraisExamen(data.fraisExamen || null)
    setClasses(data.classes || [])
    setLoading(false)
  }, [id, slug, router])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch(`/api/eleves/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      toast.error(t('detail.toasts.saveError'))
      setSaving(false)
      return
    }
    await fetchData()
    setEditing(false)
    setSaving(false)
    toast.success(t('detail.toasts.saved'))
  }

  const handleDelete = async (force = false) => {
    const res = await fetch(`/api/eleves/${id}?force=${force}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.status === 409 && data.warning) {
      setConfirmDelete(true)
      return
    }
    if (res.ok) {
      toast.success(data.message)
      router.push(`/${slug}/eleves`)
    } else {
      toast.error(data.error || t('detail.toasts.deleteError'))
    }
  }

  const handlePrint = async () => {
    const res = await fetch(`/api/eleves/${id}`)
    const data = await res.json()
    if (!res.ok) return

    const periodes = [...new Set((data.notes as Note[]).map(n => n.periode))].sort()
    const derniere = periodes[periodes.length - 1]
    const ns = (data.notes as Note[]).filter(n => n.periode === derniere)
    const totalCoef = ns.reduce((s, n) => s + n.coefficient, 0)
    const totalPts = ns.reduce((s, n) => s + n.note * n.coefficient, 0)
    const moy = totalCoef ? (totalPts / totalCoef).toFixed(2) : null

    const totalPres = (data.presences as Presence[]).length
    const nbPresent = (data.presences as Presence[]).filter(p => p.statut === 'present').length
    const taux = totalPres ? Math.round((nbPresent / totalPres) * 100) : null

    const { buildFicheEleveHtml } = await import('@/lib/school-documents')
    const html = buildFicheEleveHtml({
      ecole: data.ecole || { nom: data.ecoleNom || 'École' },
      anneeScolaire: data.anneeScolaire ?? null,
      eleve: data.eleve,
      parents: data.parents || [],
      situation: data.situation || { total_paye: 0, total_attendu: 0, total_reste: 0, statut: '—' },
      moyenne: moy,
      tauxPresence: taux,
    })

    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) { toast.error(t('detail.toasts.popupBlocked')); return }
    win.document.write(html)
    win.document.close()
  }

  const up = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  const totalPaye = situation?.total_paye ?? paiements.reduce((s, p) => s + p.montant, 0)
  const totalAttendu = situation?.total_attendu ?? 0
  const totalReste = situation?.total_reste ?? 0
  const pctPaye = totalAttendu > 0 ? Math.min(100, Math.round((totalPaye / totalAttendu) * 100)) : null

  const totalPresences = presences.length
  const nbPresent = presences.filter(p => p.statut === 'present').length
  const tauxPresence = totalPresences ? Math.round((nbPresent / totalPresences) * 100) : null

  const periodes = [...new Set(notes.map(n => n.periode))].sort()
  const dernieresPeriode = periodes[periodes.length - 1]
  const notesFiltrees = periodeFiltre === 'tous' ? notes : notes.filter(n => n.periode === periodeFiltre)
  const moyenneGenerale = () => {
    const ns = notes.filter(n => n.periode === dernieresPeriode)
    if (!ns.length) return null
    const totalCoef = ns.reduce((s, n) => s + n.coefficient, 0)
    const totalPoints = ns.reduce((s, n) => s + n.note * n.coefficient, 0)
    return totalCoef ? (totalPoints / totalCoef).toFixed(2) : null
  }

  const statutPresenceStyle = (s: string) => {
    switch (s) {
      case 'present': return 'bg-emerald-100 text-emerald-700'
      case 'absent':  return 'bg-red-100 text-red-700'
      case 'retard':  return 'bg-amber-100 text-amber-700'
      case 'excuse':  return 'bg-blue-100 text-blue-700'
      default:        return 'bg-slate-100 text-slate-600'
    }
  }

  const noteColor = (n: number) => {
    if (n >= 16) return 'text-emerald-600 font-bold'
    if (n >= 12) return 'text-blue-600 font-semibold'
    if (n >= 10) return 'text-amber-600 font-semibold'
    return 'text-red-600 font-bold'
  }

  const formatPaymentStatus = (statut: string) => {
    if (statut === 'paye' || statut === 'partiel' || statut === 'impaye' || statut === 'non_configure') {
      return te.paymentStatus(statut)
    }
    return statut
  }

  const presenceStats = [
    { statut: 'present', color: 'text-emerald-600' },
    { statut: 'absent', color: 'text-red-600' },
    { statut: 'retard', color: 'text-amber-600' },
    { statut: 'excuse', color: 'text-blue-600' },
  ] as const

  if (loading) return (
    <div className="p-8 flex items-center justify-center h-96">
      <p className="text-slate-400 text-sm">{tc('loading')}</p>
    </div>
  )

  if (!eleve) return null

  const moy = moyenneGenerale()
  const age = calcAge(eleve.date_naissance)

  return (
    <div className="p-8 max-w-5xl mx-auto">

      <button onClick={() => router.push(`/${slug}/eleves`)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {t('detail.back')}
      </button>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <PhotoUpload eleveId={eleve.id} photoUrl={eleve.photo_url} compact onUploaded={() => fetchData()} />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{eleve.nom} {eleve.prenom}</h1>
              <p className="text-sm text-slate-500 font-mono mt-0.5">{eleve.numero_matricule}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {age !== null && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">
                    {t('detail.yearsOld', { age })}
                  </span>
                )}
                {eleve.section && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                    {te.section(eleve.section)}
                  </span>
                )}
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                  {eleve.classe_nom || t('detail.noClass')}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${eleve.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {te.studentStatus(eleve.statut)}
                </span>
                {situation && (
                  <Badge variant={PAIEMENT_VARIANT[situation.statut] ?? 'neutral'} size="sm">
                    {formatPaymentStatus(situation.statut)}
                  </Badge>
                )}
                {fraisExamen?.config && (
                  <Badge variant={PAIEMENT_VARIANT[fraisExamen.statut] ?? 'neutral'} size="sm">
                    {t('detail.examLabel', { status: formatPaymentStatus(fraisExamen.statut) })}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={handlePrint} className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm transition-colors">
              <Printer className="w-4 h-4" /> {t('detail.printCard')}
            </button>
            <Link href={studentLinks(slug, { id, nom: eleve.nom, prenom: eleve.prenom, numero_matricule: eleve.numero_matricule, classe_id: eleve.classe_id }).encaisser}
              className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
              <CreditCard className="w-4 h-4" /> {t('detail.collectPayment')}
            </Link>
            {fraisExamen?.config && fraisExamen.reste > 0 && (
              <Link href={studentLinks(slug, { id, nom: eleve.nom, prenom: eleve.prenom, numero_matricule: eleve.numero_matricule, classe_id: eleve.classe_id }).encaisserExamen}
                className="flex items-center gap-1.5 border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                <GraduationCap className="w-4 h-4" /> {t('detail.examFees')}
              </Link>
            )}
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setForm(eleve) }} className="flex items-center gap-1.5 text-slate-500 border border-slate-200 px-3 py-2 rounded-lg text-sm">
                  <X className="w-4 h-4" /> {tc('cancel')}
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
                  <Save className="w-4 h-4" /> {saving ? tc('saving') : tc('save')}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm">
                  <Edit2 className="w-4 h-4" /> {tc('edit')}
                </button>
                <button
                  onClick={() => handleDelete(false)}
                  className="flex items-center gap-1.5 border border-red-200 hover:bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm transition-colors">
                  <Trash2 className="w-4 h-4" /> {tc('delete')}
                </button>
              </>
            )}
          </div>
        </div>

        {totalAttendu > 0 && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">{t('detail.financialSituation')}</span>
              <span className="font-semibold text-slate-700">
                {totalPaye.toLocaleString('fr-FR')} / {totalAttendu.toLocaleString('fr-FR')} {tc('currency')}
                {totalReste > 0 && (
                  <span className="text-red-600 ml-2">
                    {t('detail.remaining', { amount: totalReste.toLocaleString('fr-FR') })}
                  </span>
                )}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${pctPaye === 100 ? 'bg-emerald-500' : pctPaye && pctPaye > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${pctPaye ?? 0}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{totalPaye.toLocaleString('fr-FR')} F</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('detail.totalPaid')}</p>
          </div>
          <div className="text-center border-x border-slate-100">
            <p className="text-2xl font-bold text-slate-800">
              {moy ? formatMoyenne(parseFloat(moy), eleve.section || eleve.classe_section || 'francophone') : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{t('detail.average', { period: dernieresPeriode || '' })}</p>
          </div>
          <div className="text-center border-r border-slate-100">
            <p className="text-2xl font-bold text-slate-800">{tauxPresence !== null ? `${tauxPresence}%` : '—'}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('detail.attendanceRate')}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{notes.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t('detail.gradesCount')}</p>
          </div>
        </div>
      </div>

      {(() => {
        const links = studentLinks(slug, {
          id: eleve.id,
          nom: eleve.nom,
          prenom: eleve.prenom,
          numero_matricule: eleve.numero_matricule,
          classe_id: eleve.classe_id,
          section: eleve.section || eleve.classe_section,
        })
        const quickActions = [
          { key: 'bulletin', href: links.bulletin, icon: BookOpen },
          { key: 'attendance', href: links.presences, icon: Clock },
          { key: 'class', href: links.classe, icon: GraduationCap },
          { key: 'transfer', href: links.transfert, icon: TrendingUp },
        ] as const
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {quickActions.map(a => (
              <Link key={a.key} href={a.href} className="card p-3 flex items-center gap-3 hover:border-emerald-300 transition-colors group">
                <a.icon className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-600">
                  {t(`detail.quickActions.${a.key}`)}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-300 ml-auto" />
              </Link>
            ))}
          </div>
        )
      })()}

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
        {([
          { key: 'info', tab: 'infos' as const, icon: User },
          { key: 'payments', tab: 'paiements' as const, icon: CreditCard },
          { key: 'grades', tab: 'notes' as const, icon: BookOpen },
          { key: 'attendance', tab: 'presences' as const, icon: Clock },
        ]).map(({ key, tab, icon: Icon }) => (
          <button key={key} onClick={() => setOnglet(tab)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${onglet === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon className="w-4 h-4" />{t(`detail.tabs.${key}`)}
          </button>
        ))}
      </div>

      {onglet === 'infos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h2 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> {t('detail.personalInfo')}
            </h2>
            <div className="space-y-3">
              {editing ? (
                <>
                  <Field label={t('detail.fields.lastName')}><input value={form.nom || ''} onChange={e => up('nom', e.target.value)} className="input-field" /></Field>
                  <Field label={t('detail.fields.firstName')}><input value={form.prenom || ''} onChange={e => up('prenom', e.target.value)} className="input-field" /></Field>
                  <Field label={t('detail.fields.sex')}>
                    <select value={form.sexe || ''} onChange={e => up('sexe', e.target.value)} className="input-field">
                      <option value="M">{te.sex('M')}</option>
                      <option value="F">{te.sex('F')}</option>
                    </select>
                  </Field>
                  <Field label={t('detail.fields.birthDate')}><input type="date" value={form.date_naissance || ''} onChange={e => up('date_naissance', e.target.value)} className="input-field" /></Field>
                  <Field label={t('detail.fields.birthPlace')}><input value={form.lieu_naissance || ''} onChange={e => up('lieu_naissance', e.target.value)} className="input-field" /></Field>
                  <Field label={t('detail.fields.class')}>
                    <select value={form.classe_id || ''} onChange={e => up('classe_id', e.target.value)} className="input-field">
                      <option value="">{t('detail.noneOption')}</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.nom} ({te.section(c.section)})</option>)}
                    </select>
                  </Field>
                  <Field label={t('detail.fields.annualStatus')}>
                    <select value={form.statut_annuel || ''} onChange={e => up('statut_annuel', e.target.value)} className="input-field">
                      <option value="">—</option>
                      {ANNUAL_STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>{te.annualStatus(status)}</option>
                      ))}
                    </select>
                  </Field>
                </>
              ) : (
                <>
                  <InfoRow icon={<User className="w-3.5 h-3.5" />} label={t('detail.fields.sex')} value={te.sex(eleve.sexe)} />
                  <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label={t('detail.fields.birthDateShort')} value={eleve.date_naissance ? `${eleve.date_naissance}${age !== null ? ` (${t('detail.yearsOld', { age })})` : ''}` : '—'} />
                  <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label={t('detail.fields.birthPlaceShort')} value={eleve.lieu_naissance || '—'} />
                  <InfoRow icon={<GraduationCap className="w-3.5 h-3.5" />} label={t('detail.fields.class')} value={eleve.classe_nom || '—'} />
                  <InfoRow icon={<GraduationCap className="w-3.5 h-3.5" />} label={t('detail.fields.entryYear')} value={eleve.annee_entree || '—'} />
                  <InfoRow icon={<GraduationCap className="w-3.5 h-3.5" />} label={t('detail.fields.annualStatus')} value={eleve.statut_annuel ? te.annualStatus(eleve.statut_annuel) : '—'} />
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" /> {t('detail.parents')}
              </h2>
              {parents.length === 0 ? (
                <p className="text-slate-400 text-sm">{t('detail.noParent')}</p>
              ) : (
                <div className="space-y-4">
                  {parents.map(p => (
                    <div key={p.id} className="border border-slate-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-slate-800 text-sm">{p.nom} {p.prenom}</p>
                        {p.est_principal ? <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">{t('detail.principal')}</span> : null}
                      </div>
                      <p className="text-xs text-slate-500 mb-1">{te.parentLink(p.lien)}</p>
                      <a href={`tel:${p.telephone}`} className="text-sm text-emerald-600 font-mono hover:underline">{p.telephone}</a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {situation && situation.tranches.length > 0 && (
              <div className="card p-5">
                <h2 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-400" /> {t('detail.installmentsDetail')}
                </h2>
                <div className="space-y-2">
                  {situation.tranches.map(tranche => (
                    <div key={tranche.tranche_numero} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0">
                      <span className="text-slate-600">{t('detail.installment', { n: tranche.tranche_numero })}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{tranche.montant_paye.toLocaleString('fr-FR')} / {tranche.montant_attendu.toLocaleString('fr-FR')} F</span>
                        <Badge variant={PAIEMENT_VARIANT[tranche.statut] ?? 'neutral'} size="sm">{formatPaymentStatus(tranche.statut)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {fraisExamen?.config && (
              <div className="card p-5 border-violet-100">
                <h2 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-violet-500" /> {fraisExamen.config.label}
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{t('detail.amount')}</span>
                    <span className="font-semibold">{fraisExamen.montant_attendu.toLocaleString('fr-FR')} {tc('currency')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{t('detail.paid')}</span>
                    <span className="font-semibold text-emerald-600">{fraisExamen.montant_paye.toLocaleString('fr-FR')} {tc('currency')}</span>
                  </div>
                  {fraisExamen.reste > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">{t('detail.remainingLabel')}</span>
                      <span className="font-semibold text-red-600">{fraisExamen.reste.toLocaleString('fr-FR')} {tc('currency')}</span>
                    </div>
                  )}
                  {fraisExamen.date_limite && (
                    <p className={`text-xs ${fraisExamen.en_retard ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                      {fraisExamen.en_retard
                        ? t('detail.dueDateOverdue', { days: Math.abs(fraisExamen.jours_restants ?? 0) })
                        : fraisExamen.jours_restants !== null && fraisExamen.jours_restants >= 0
                          ? t('detail.dueDateRemaining', {
                              date: new Date(fraisExamen.date_limite).toLocaleDateString('fr-FR'),
                              days: fraisExamen.jours_restants,
                            })
                          : t('detail.dueDate', { date: new Date(fraisExamen.date_limite).toLocaleDateString('fr-FR') })}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <Badge variant={PAIEMENT_VARIANT[fraisExamen.statut] ?? 'neutral'} size="sm">
                      {formatPaymentStatus(fraisExamen.statut)}
                    </Badge>
                    {fraisExamen.reste > 0 && (
                      <Link
                        href={studentLinks(slug, { id, nom: eleve.nom, prenom: eleve.prenom, numero_matricule: eleve.numero_matricule, classe_id: eleve.classe_id }).encaisserExamen}
                        className="text-xs font-semibold text-violet-600 hover:underline"
                      >
                        {t('detail.collect')}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-slate-800 mb-2">{t('detail.deleteConfirmTitle')}</h3>
            <p className="text-slate-500 text-sm mb-6">{t('detail.deleteConfirmBody')}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-lg px-4 py-2.5 text-sm hover:bg-slate-50">
                {tc('cancel')}
              </button>
              <button onClick={() => { setConfirmDelete(false); handleDelete(true) }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg px-4 py-2.5 text-sm">
                {t('detail.deleteAnyway')}
              </button>
            </div>
          </div>
        </div>
      )}

      {onglet === 'paiements' && (
        <div className="card overflow-hidden">
          {paiements.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <p className="mb-4">{t('detail.noPayments')}</p>
              <Link href={studentLinks(slug, { id, nom: eleve.nom, prenom: eleve.prenom, numero_matricule: eleve.numero_matricule, classe_id: eleve.classe_id }).encaisser}
                className="btn-primary inline-flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> {t('detail.recordPayment')}
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{[
                  t('detail.columns.date'),
                  t('detail.columns.installment'),
                  t('detail.columns.amount'),
                  t('detail.columns.method'),
                  t('detail.columns.receipt'),
                ].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paiements.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">{p.date_paiement}</td>
                    <td className="px-4 py-3">
                      {p.tranche_numero
                        ? <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700">{t('detail.installment', { n: p.tranche_numero })}</span>
                        : <span className="text-xs text-slate-400">{t('detail.miscFees')}</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 text-sm">{p.montant.toLocaleString('fr-FR')} F</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{p.mode_paiement ? te.paymentMethod(p.mode_paiement) : '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">{p.recu_numero || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-slate-600">{t('detail.total')}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{totalPaye.toLocaleString('fr-FR')} F</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {onglet === 'notes' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-slate-500">{t('detail.period')}</span>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setPeriodeFiltre('tous')} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${periodeFiltre === 'tous' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{t('detail.allPeriods')}</button>
              {periodes.map(p => (
                <button key={p} onClick={() => setPeriodeFiltre(p)} className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${periodeFiltre === p ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="card overflow-hidden">
            {notesFiltrees.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">{t('detail.noGrades')}</div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{[
                    t('detail.columns.subject'),
                    t('detail.columns.period'),
                    t('detail.columns.grade', { max: getNoteMax(eleve.section || 'francophone') }),
                    t('detail.columns.coef'),
                    t('detail.columns.appreciation'),
                  ].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notesFiltrees.map(n => (
                    <tr key={n.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{n.matiere_nom}</td>
                      <td className="px-4 py-3"><span className="text-xs capitalize px-2 py-1 rounded-full bg-slate-100 text-slate-600">{n.periode}</span></td>
                      <td className={`px-4 py-3 text-sm ${noteColor(n.note)}`}>{n.note}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{n.coefficient}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 italic">{n.appreciation || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {onglet === 'presences' && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {presenceStats.map(({ statut, color }) => (
              <div key={statut} className="card p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{presences.filter(p => p.statut === statut).length}</p>
                <p className="text-xs text-slate-500 mt-0.5">{te.presenceStatus(statut)}</p>
              </div>
            ))}
          </div>
          <div className="card overflow-hidden">
            {presences.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">{t('detail.noAttendance')}</div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{[
                    t('detail.columns.date'),
                    t('detail.columns.status'),
                    t('detail.columns.observation'),
                  ].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {presences.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600">{p.date}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statutPresenceStyle(p.statut)}`}>{te.presenceStatus(p.statut)}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-500">{p.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>{children}</div>)
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="flex items-center gap-1.5 text-xs text-slate-400">{icon} {label}</span>
      <span className="text-sm text-slate-700 font-medium">{value}</span>
    </div>
  )
}
