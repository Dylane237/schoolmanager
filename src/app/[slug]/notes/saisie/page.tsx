'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Save, Plus, X, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import PageShell from '@/components/layout/PageShell'
import EmptyState from '@/components/ui/EmptyState'
import SmartFilterBar from '@/components/filters/SmartFilterBar'
import StudentContextBanner from '@/components/students/StudentContextBanner'
import { useSmartFilters } from '@/hooks/useSmartFilters'
import { useStudentDeepLink } from '@/hooks/useStudentDeepLink'
import { useClasses } from '@/hooks/useClasses'
import { studentLinks } from '@/lib/student-context-links'
import { getNoteMax, getMention } from '@/lib/notes-utils'

interface Matiere { id: string; nom: string; coefficient: number }
interface Eleve { id: string; nom: string; prenom: string; numero_matricule: string }
interface Note { eleve_id: string; note: number; appreciation: string }

function SaisieNotesPageFallback() {
  const t = useTranslations('notes')
  const tc = useTranslations('common')

  return (
    <PageShell title={t('entry.title')} breadcrumb={t('entry.breadcrumb')}>
      <div className="card p-12 text-center text-slate-400">{tc('loading')}</div>
    </PageShell>
  )
}

export default function SaisieNotesPage() {
  return (
    <Suspense fallback={<SaisieNotesPageFallback />}>
      <SaisieNotesPageContent />
    </Suspense>
  )
}

function SaisieNotesPageContent() {
  const { slug } = useParams() as { slug: string }
  const t = useTranslations('notes')
  const tc = useTranslations('common')
  const tf = useTranslations('filters')
  const { classes } = useClasses()
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [section, setSection] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showMatForm, setShowMatForm] = useState(false)
  const [newMat, setNewMat] = useState({ nom: '', coefficient: '1' })

  const periodes = section === 'anglophone'
    ? ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
    : ['T1', 'T2', 'T3']

  const matiereOptions = useMemo(() => [
    { value: '', label: t('entry.selectSubjectOption') },
    ...matieres.map(m => ({
      value: m.id,
      label: t('entry.subjectWithCoef', { name: m.nom, coef: m.coefficient }),
    })),
  ], [matieres, t])

  const filterFields = useMemo(() => [
    {
      key: 'classe',
      type: 'select' as const,
      label: tf('labels.class'),
      options: [{ value: '', label: t('entry.selectClassOption') }, ...classes.map(c => ({ value: c.id, label: c.nom }))],
      defaultValue: '',
    },
    {
      key: 'matiere',
      type: 'select' as const,
      label: tf('labels.subject'),
      options: matiereOptions,
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
      placeholder: t('entry.filterStudent'),
      debounce: true,
    },
  ], [classes, matiereOptions, periodes, section, t, tf])

  const { values, debouncedValues, setFilter, setFilters, reset, activeFilters } = useSmartFilters(filterFields)
  const { student } = useStudentDeepLink(setFilters)
  const classeId = values.classe
  const matiereId = values.matiere
  const periode = values.periode || (section === 'anglophone' ? 'S1' : 'T1')

  useEffect(() => {
    if (!classeId) {
      setMatieres([])
      setEleves([])
      setNotes({})
      return
    }
    const classe = classes.find(c => c.id === classeId)
    setSection(classe?.section || '')
    fetch(`/api/notes?classe_id=${classeId}`)
      .then(r => r.json())
      .then(d => {
        setMatieres(d.matieres || [])
        setEleves(d.eleves || [])
        if (d.section) setSection(d.section)
      })
    setFilter('matiere', '')
    setNotes({})
  }, [classeId, classes])

  useEffect(() => {
    if (!classeId || !matiereId || !periode) return
    fetch(`/api/notes?classe_id=${classeId}&matiere_id=${matiereId}&periode=${periode}`)
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = {}
        d.notes?.forEach((n: Note) => { map[n.eleve_id] = String(n.note) })
        setNotes(map)
      })
  }, [classeId, matiereId, periode])

  const filteredEleves = useMemo(() => {
    const q = debouncedValues.q?.toLowerCase().trim()
    if (!q) return eleves
    return eleves.filter(e =>
      `${e.nom} ${e.prenom} ${e.numero_matricule}`.toLowerCase().includes(q)
    )
  }, [eleves, debouncedValues.q])

  const noteMax = getNoteMax(section)

  const handleSave = async () => {
    setSaving(true)
    const promises = Object.entries(notes).map(([eleve_id, note]) =>
      fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eleve_id, matiere_id: matiereId, periode, note: parseFloat(note), ecole_id: '' }),
      })
    )
    await Promise.all(promises)
    setSaving(false)
    setSaved(true)
    toast.success(t('entry.toasts.saved'))
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAddMatiere = async () => {
    if (!newMat.nom || !classeId) return
    const classe = classes.find(c => c.id === classeId)
    await fetch('/api/matieres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newMat, classe_id: classeId, section: classe?.section }),
    })
    const d = await fetch(`/api/notes?classe_id=${classeId}`).then(r => r.json())
    setMatieres(d.matieres || [])
    setNewMat({ nom: '', coefficient: '1' })
    setShowMatForm(false)
  }

  const getMentionLabel = (note: number) => getMention(note, section)

  return (
    <PageShell
      title={t('entry.title')}
      subtitle={section === 'anglophone' ? t('entry.subtitleAnglophone') : t('entry.subtitleFrancophone')}
      breadcrumb={t('entry.breadcrumb')}
    >
      <SmartFilterBar
        fields={filterFields}
        values={values}
        onChange={setFilter}
        onReset={reset}
        activeFilters={activeFilters}
        resultCount={matiereId ? filteredEleves.length : undefined}
        resultLabel={t('entry.resultLabel')}
        extra={
          <div className="flex gap-2">
            {classeId && (
              <button onClick={() => setShowMatForm(true)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50">
                <Plus className="w-3.5 h-3.5 inline mr-1" /> {t('entry.addSubject')}
              </button>
            )}
            {matiereId && (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                <Save className="w-3.5 h-3.5" />
                {saving ? tc('saving') : saved ? tc('saved') : tc('save')}
              </button>
            )}
          </div>
        }
        className="mb-4"
      />

      {student && <StudentContextBanner slug={slug} student={student} className="mb-6" />}

      {showMatForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">{t('entry.newSubjectTitle')}</h3>
              <button onClick={() => setShowMatForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <input value={newMat.nom} onChange={e => setNewMat(p => ({ ...p, nom: e.target.value }))}
                placeholder={t('entry.subjectNamePlaceholder')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              <input type="number" value={newMat.coefficient}
                onChange={e => setNewMat(p => ({ ...p, coefficient: e.target.value }))}
                placeholder={t('entry.coefficientPlaceholder')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              <button onClick={handleAddMatiere}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg px-4 py-2.5 text-sm">
                {tc('add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {!classeId ? (
        <div className="card p-12 text-center text-slate-400 text-sm">{t('entry.selectClass')}</div>
      ) : !matiereId ? (
        <div className="card p-12 text-center text-slate-400 text-sm">{t('entry.selectSubject')}</div>
      ) : filteredEleves.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t('entry.emptyTitle')}
          description={t('entry.emptyDescription')}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('entry.columns.student')}</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-500 uppercase tracking-wide w-32">{t('entry.columns.grade', { max: noteMax || 20 })}</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('entry.columns.mention')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEleves.map((eleve, i) => {
                const noteVal = parseFloat(notes[eleve.id] || '')
                const mention = !isNaN(noteVal) ? getMentionLabel(noteVal) : null
                return (
                  <tr key={eleve.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={studentLinks(slug, { id: eleve.id, nom: eleve.nom, prenom: eleve.prenom, numero_matricule: eleve.numero_matricule }).fiche}
                        className="group block">
                        <p className="font-medium text-slate-800 text-sm group-hover:text-emerald-700">{eleve.nom} {eleve.prenom}</p>
                        <p className="text-xs text-slate-400">{eleve.numero_matricule}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number" min="0" max={noteMax || 20} step="0.25"
                        value={notes[eleve.id] || ''}
                        onChange={e => setNotes(prev => ({ ...prev, [eleve.id]: e.target.value }))}
                        placeholder="—"
                        className="w-24 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 text-center"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {mention && <span className={`text-xs font-semibold ${mention.color}`}>{mention.label}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  )
}
