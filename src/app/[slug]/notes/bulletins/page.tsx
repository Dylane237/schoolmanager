'use client'

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { Printer, FileText, Download, Users, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import PageShell from '@/components/layout/PageShell'
import EmptyState from '@/components/ui/EmptyState'
import DocumentHeaderPreview from '@/components/documents/DocumentHeaderPreview'
import SmartFilterBar from '@/components/filters/SmartFilterBar'
import StudentContextBanner from '@/components/students/StudentContextBanner'
import { useSmartFilters } from '@/hooks/useSmartFilters'
import { useStudentDeepLink } from '@/hooks/useStudentDeepLink'
import { studentLinks } from '@/lib/student-context-links'
import { useClasses } from '@/hooks/useClasses'
import { useTranslatedEnums } from '@/hooks/useTranslatedEnums'
import type { DocumentSection } from '@/lib/school-documents'

interface Classe { id: string; nom: string; section: string }

interface BulletinData {
  ecole: {
    nom: string; directeur_nom: string; adresse: string
    telephone?: string; email?: string; entete_url?: string | null
  }
  classe: { nom: string; section: string }
  periode: string
  noteMax: number
  anneeScolaire: string | null
  effectif: number
  bulletins: {
    eleve: {
      id: string
      nom: string; prenom: string; numero_matricule: string; sexe: string
      date_naissance?: string | null; lieu_naissance?: string | null
    }
    notes: { matiere: string; coefficient: number; note: number | null; appreciation: string | null }[]
    moyenne: number | null
    mention: string | null
    rang: number | null
    noteMax: number
  }[]
}

function formatDate(dateStr: string | null | undefined, locale: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function BulletinsPageFallback() {
  const t = useTranslations('notes')
  const tc = useTranslations('common')

  return (
    <PageShell title={t('bulletins.title')} breadcrumb={t('bulletins.breadcrumb')}>
      <div className="card p-16 text-center text-slate-400">{tc('loading')}</div>
    </PageShell>
  )
}

export default function BulletinsPage() {
  return (
    <Suspense fallback={<BulletinsPageFallback />}>
      <BulletinsPageContent />
    </Suspense>
  )
}

function BulletinsPageContent() {
  const { slug } = useParams() as { slug: string }
  const locale = useLocale()
  const t = useTranslations('notes')
  const tc = useTranslations('common')
  const tf = useTranslations('filters')
  const te = useTranslatedEnums()
  const { classes } = useClasses()
  const [section, setSection] = useState('francophone')
  const [data, setData] = useState<BulletinData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [examWarning, setExamWarning] = useState<{
    label: string
    reste: number
    statut: string
  } | null>(null)
  const targetEleveId = useRef<string | null>(null)

  const periodes = section === 'anglophone'
    ? ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
    : ['T1', 'T2', 'T3']

  const filterFields = useMemo(() => [
    {
      key: 'classe',
      type: 'select' as const,
      label: tf('labels.class'),
      options: [
        { value: '', label: t('bulletins.selectClassOption') },
        ...classes.map(c => ({ value: c.id, label: `${c.nom} (${te.section(c.section)})` })),
      ],
      defaultValue: '',
    },
    {
      key: 'periode',
      type: 'select' as const,
      label: tf('labels.period'),
      options: periodes.map(p => ({ value: p, label: p })),
      defaultValue: section === 'anglophone' ? 'S1' : 'T1',
    },
    {
      key: 'q',
      type: 'search' as const,
      placeholder: t('bulletins.searchPlaceholder'),
      debounce: true,
    },
    {
      key: 'mention',
      type: 'pills' as const,
      label: tf('labels.mention'),
      options: [
        { value: 'tous', label: t('bulletins.mentionFilters.all') },
        { value: 'TB', label: t('bulletins.mentionFilters.TB') },
        { value: 'B', label: t('bulletins.mentionFilters.B') },
        { value: 'AB', label: t('bulletins.mentionFilters.AB') },
        { value: 'P', label: t('bulletins.mentionFilters.P') },
        { value: 'I', label: t('bulletins.mentionFilters.I') },
      ],
      defaultValue: 'tous',
    },
  ], [classes, periodes, section, t, tf, te])

  const { values, debouncedValues, setFilter, setFilters, reset, activeFilters } = useSmartFilters(filterFields)
  const { student } = useStudentDeepLink(setFilters, {
    apply: s => {
      targetEleveId.current = s.id
      const patch: Record<string, string> = {
        q: s.numero_matricule || `${s.nom} ${s.prenom}`.trim(),
      }
      if (s.classe_id) patch.classe = s.classe_id
      return patch
    },
  })
  const classeId = values.classe
  const periode = values.periode || (section === 'anglophone' ? 'S1' : 'T1')

  useEffect(() => {
    if (!classeId) { setData(null); return }
    const c = classes.find(x => x.id === classeId)
    if (c) {
      setSection(c.section)
      if (!values.periode) {
        setFilter('periode', c.section === 'anglophone' ? 'S1' : 'T1')
      }
    }
  }, [classeId, classes])

  const loadBulletins = useCallback(async () => {
    if (!classeId || !periode) return
    setLoading(true)
    const res = await fetch(`/api/bulletins?classe_id=${classeId}&periode=${periode}`)
    const d = await res.json()
    if (!res.ok) {
      toast.error(d.error || tc('errorLoad'))
      setLoading(false)
      return
    }
    setData(d)
    if (!targetEleveId.current) setSelectedIdx(0)
    setLoading(false)
  }, [classeId, periode, tc])

  useEffect(() => { loadBulletins() }, [loadBulletins])

  const mentionMatch = (mention: string | null, filter: string) => {
    if (!filter || filter === 'tous' || !mention) return filter === 'tous'
    const map: Record<string, string[]> = {
      TB: ['Très Bien', 'A'],
      B: ['Bien', 'B'],
      AB: ['Assez Bien', 'C'],
      P: ['Passable', 'D'],
      I: ['Insuffisant', 'F'],
    }
    return map[filter]?.some(m => mention.includes(m)) ?? true
  }

  const filteredBulletins = useMemo(() => {
    if (!data) return []
    let list = data.bulletins
    const q = debouncedValues.q?.toLowerCase().trim()
    if (q) {
      list = list.filter(b =>
        `${b.eleve.nom} ${b.eleve.prenom} ${b.eleve.numero_matricule}`.toLowerCase().includes(q)
      )
    }
    if (debouncedValues.mention && debouncedValues.mention !== 'tous') {
      list = list.filter(b => mentionMatch(b.mention, debouncedValues.mention))
    }
    return list
  }, [data, debouncedValues.q, debouncedValues.mention])

  useEffect(() => {
    if (selectedIdx >= filteredBulletins.length) setSelectedIdx(0)
  }, [filteredBulletins.length, selectedIdx])

  useEffect(() => {
    if (!targetEleveId.current || filteredBulletins.length === 0) return
    const idx = filteredBulletins.findIndex(b => b.eleve.id === targetEleveId.current)
    if (idx >= 0) {
      setSelectedIdx(idx)
      targetEleveId.current = null
    }
  }, [filteredBulletins])

  const bulletin = filteredBulletins[selectedIdx] ?? filteredBulletins[0]
  const isAng = data?.classe.section === 'anglophone'
  const docPrefix = isAng ? 'bulletins.docAng' : 'bulletins.docFr'
  const doc = (key: string, values?: Record<string, string | number>) =>
    t(`${docPrefix}.${key}` as 'bulletins.docFr.fullName', values)

  useEffect(() => {
    if (!bulletin?.eleve.id) {
      setExamWarning(null)
      return
    }
    fetch(`/api/frais-examens?eleve_id=${bulletin.eleve.id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const s = d?.situation
        if (s?.config && (s.statut === 'impaye' || s.statut === 'partiel')) {
          setExamWarning({
            label: s.config.label,
            reste: s.reste,
            statut: s.statut,
          })
        } else {
          setExamWarning(null)
        }
      })
      .catch(() => setExamWarning(null))
  }, [bulletin?.eleve.id])

  const showExamWarningToast = () => {
    if (!examWarning) return
    toast(
      t('bulletins.toasts.examUnpaid', {
        label: examWarning.label,
        amount: Number(examWarning.reste).toLocaleString(locale),
      }),
      { icon: '⚠️', duration: 6000 },
    )
  }

  const handlePrint = () => {
    if (!classeId || !periode || !bulletin?.eleve.id) return
    showExamWarningToast()
    const url = `/api/bulletins/print?classe_id=${classeId}&periode=${periode}&eleve_id=${bulletin.eleve.id}`
    const win = window.open(url, '_blank', 'width=800,height=1000')
    if (!win) toast.error(t('bulletins.toasts.popupBlocked'))
  }

  const handlePrintAll = async () => {
    if (!classeId || !periode) return
    const res = await fetch(`/api/frais-examens?classe_id=${classeId}`)
    const d = res.ok ? await res.json() : null
    if (d?.frais_examen && d.impayes > 0) {
      toast(
        t('bulletins.toasts.examUnpaidBulk', {
          count: d.impayes,
          label: d.frais_examen.label,
        }),
        { icon: '⚠️', duration: 6000 },
      )
    }
    const url = `/api/bulletins/print?classe_id=${classeId}&periode=${periode}`
    const win = window.open(url, '_blank', 'width=800,height=1000')
    if (!win) toast.error(t('bulletins.toasts.popupBlocked'))
    else toast.success(t('bulletins.toasts.printAll', { count: data?.bulletins.length ?? 0 }))
  }

  return (
    <PageShell
      title={t('bulletins.title')}
      subtitle={t('bulletins.subtitle')}
      breadcrumb={t('bulletins.breadcrumb')}
      actions={
        data && data.bulletins.length > 0 ? (
          <div className="flex gap-2">
            <button onClick={handlePrint} className="btn-primary flex items-center gap-2 py-2.5">
              <Printer className="w-4 h-4" /> {t('bulletins.print')}
            </button>
            <button onClick={handlePrintAll}
              className="border border-slate-200 text-slate-700 font-semibold rounded-xl px-4 py-2.5 text-base hover:bg-white transition-colors flex items-center gap-2 bg-white">
              <Download className="w-4 h-4" /> {t('bulletins.printAll')}
            </button>
          </div>
        ) : undefined
      }
    >
      <SmartFilterBar
        fields={filterFields}
        values={values}
        onChange={setFilter}
        onReset={reset}
        activeFilters={activeFilters}
        resultCount={data ? filteredBulletins.length : undefined}
        resultLabel={t('bulletins.resultLabel')}
        loading={loading}
        className="mb-4"
      />

      {student && (
        <StudentContextBanner slug={slug} student={student} className="mb-6" />
      )}

      {examWarning && (
        <div className="flex items-start gap-3 px-4 py-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">{t('bulletins.examWarningTitle')}</p>
            <p className="text-amber-800 mt-0.5">
              {t('bulletins.examWarningBody', {
                label: examWarning.label,
                amount: Number(examWarning.reste).toLocaleString(locale),
              })}
            </p>
          </div>
        </div>
      )}

      {!classeId ? (
        <EmptyState
          icon={FileText}
          title={t('bulletins.emptySelectClass')}
          description={t('bulletins.emptySelectClassDesc')}
        />
      ) : loading ? (
        <div className="card p-16 text-center text-slate-400 text-base">{t('bulletins.generating')}</div>
      ) : !bulletin ? (
        <EmptyState
          icon={Users}
          title={t('bulletins.emptyNone')}
          description={t('bulletins.emptyNoneDesc')}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto">
            {filteredBulletins.map((b, i) => (
              <div key={b.eleve.id} className={`rounded-xl border transition-all ${
                  selectedIdx === i
                    ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}>
                <button type="button" onClick={() => setSelectedIdx(i)}
                  className="w-full text-left p-4">
                  <p className="font-semibold text-slate-800 text-base">{b.eleve.nom} {b.eleve.prenom}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{b.eleve.numero_matricule}</p>
                  {b.moyenne !== null && (
                    <p className="text-sm font-bold text-emerald-600 mt-1">
                      {b.moyenne.toFixed(2)}/{b.noteMax} {b.mention && `· ${b.mention}`}
                    </p>
                  )}
                </button>
                <div className="px-4 pb-3">
                  <Link href={studentLinks(slug, {
                    id: b.eleve.id,
                    nom: b.eleve.nom,
                    prenom: b.eleve.prenom,
                    numero_matricule: b.eleve.numero_matricule,
                  }).fiche}
                    className="text-xs text-emerald-600 hover:underline font-medium">
                    {t('bulletins.viewProfile')}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-3">
            <div className="card p-8 print-area">
              <DocumentHeaderPreview
                ecole={data!.ecole}
                section={data!.classe.section as DocumentSection}
                periode={periode}
                anneeScolaire={data!.anneeScolaire}
                kind="bulletin"
              />

              <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                <div><span className="text-slate-500">{doc('fullName')} : </span><strong>{bulletin.eleve.nom} {bulletin.eleve.prenom}</strong></div>
                <div><span className="text-slate-500">{doc('matricule')} : </span>{bulletin.eleve.numero_matricule}</div>
                <div><span className="text-slate-500">{doc('birth')} : </span>{formatDate(bulletin.eleve.date_naissance, locale)} {doc('birthAt')} {bulletin.eleve.lieu_naissance || '—'}</div>
                <div><span className="text-slate-500">{doc('sex')} : </span>{bulletin.eleve.sexe === 'M' ? doc('sexMale') : doc('sexFemale')}</div>
                <div><span className="text-slate-500">{doc('class')} : </span><strong>{data!.classe.nom}</strong></div>
                <div><span className="text-slate-500">{doc('classSize')} : </span>{data!.effectif} {doc('students')}</div>
              </div>

              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-2.5 border border-slate-200 text-xs uppercase">{doc('subject')}</th>
                    <th className="text-center p-2.5 border border-slate-200 text-xs uppercase w-16">{doc('coef')}</th>
                    <th className="text-center p-2.5 border border-slate-200 text-xs uppercase w-20">{doc('grade', { max: data!.noteMax })}</th>
                    <th className="text-left p-2.5 border border-slate-200 text-xs uppercase">{doc('appreciation')}</th>
                    <th className="text-center p-2.5 border border-slate-200 text-xs uppercase w-14">{doc('sign')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bulletin.notes.map((n, i) => (
                    <tr key={i}>
                      <td className="p-2.5 border border-slate-200 text-sm font-medium">{n.matiere}</td>
                      <td className="p-2.5 border border-slate-200 text-sm text-center">{n.coefficient}</td>
                      <td className="p-2.5 border border-slate-200 text-sm text-center font-semibold">
                        {n.note !== null ? n.note.toFixed(2) : '—'}
                      </td>
                      <td className="p-2.5 border border-slate-200 text-sm text-slate-500 italic">
                        {n.appreciation || '—'}
                      </td>
                      <td className="p-2.5 border border-slate-200"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-around my-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {bulletin.moyenne !== null ? bulletin.moyenne.toFixed(2) : '—'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{doc('average', { max: data!.noteMax })}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-800">
                    {bulletin.rang ? `${bulletin.rang} / ${data!.effectif}` : '—'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{doc('rank')}</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-blue-600">{bulletin.mention ?? '—'}</p>
                  <p className="text-xs text-slate-500 mt-1">{doc('gradeLabel')}</p>
                </div>
              </div>

              <div className="text-sm mb-6 space-y-3">
                <div>
                  <strong>{doc('conduct')} :</strong>
                  <div className="border-b border-dotted border-slate-300 mt-1 min-h-[20px]"></div>
                </div>
                <div>
                  <strong>{doc('councilObs')} :</strong>
                  <div className="border-b border-dotted border-slate-300 mt-1 min-h-[20px]"></div>
                </div>
              </div>

              <div className="flex justify-between mt-10 gap-4">
                <div className="border-t border-slate-300 pt-2 w-[30%] text-center text-xs text-slate-500">
                  {doc('parent')}
                </div>
                <div className="border-t border-slate-300 pt-2 w-[30%] text-center text-xs text-slate-500">
                  {doc('teacher')}
                </div>
                <div className="border-t border-slate-300 pt-2 w-[30%] text-center text-xs text-slate-500">
                  {data!.ecole.directeur_nom || doc('director')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
