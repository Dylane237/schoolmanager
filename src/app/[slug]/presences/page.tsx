'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Save, CheckSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import PageShell from '@/components/layout/PageShell'
import EmptyState from '@/components/ui/EmptyState'
import SmartFilterBar from '@/components/filters/SmartFilterBar'
import StudentContextBanner from '@/components/students/StudentContextBanner'
import { useSmartFilters } from '@/hooks/useSmartFilters'
import { useStudentDeepLink } from '@/hooks/useStudentDeepLink'
import { useClasses } from '@/hooks/useClasses'
import { studentLinks } from '@/lib/student-context-links'
import { PRESENCE_DATE_PRESETS, dateWithOffset } from '@/lib/filter-presets'

interface ElevePresence {
  id: string
  nom: string
  prenom: string
  numero_matricule: string
  statut: string | null
  obs: string | null
}

type Statut = 'present' | 'absent' | 'retard' | 'excuse'

const FILTER_FIELDS = [
  {
    key: 'classe',
    type: 'select' as const,
    label: 'Classe',
    options: [{ value: '', label: 'Sélectionner une classe' }],
    defaultValue: '',
  },
  {
    key: 'date',
    type: 'date' as const,
    label: 'Date',
    defaultValue: new Date().toISOString().split('T')[0],
  },
  {
    key: 'q',
    type: 'search' as const,
    placeholder: 'Filtrer un élève...',
    debounce: true,
  },
  {
    key: 'statut',
    type: 'pills' as const,
    label: 'Afficher',
    options: [
      { value: 'tous', label: 'Tous' },
      { value: 'present', label: 'Présents' },
      { value: 'absent', label: 'Absents' },
      { value: 'retard', label: 'Retards' },
      { value: 'excuse', label: 'Excusés' },
    ],
    defaultValue: 'tous',
  },
]

function PresencesPageContent() {
  const { slug } = useParams() as { slug: string }
  const { classes } = useClasses()
  const [eleves, setEleves] = useState<ElevePresence[]>([])
  const [presences, setPresences] = useState<Record<string, Statut>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fields = useMemo(() => FILTER_FIELDS.map(f =>
    f.key === 'classe'
      ? { ...f, options: [{ value: '', label: 'Sélectionner une classe' }, ...classes.map(c => ({ value: c.id, label: c.nom }))] }
      : f
  ), [classes])

  const { values, debouncedValues, setFilter, setFilters, reset, activeFilters } = useSmartFilters(fields)
  const { student } = useStudentDeepLink(setFilters)
  const classeId = values.classe
  const date = values.date || new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (!classeId) { setEleves([]); return }
    setLoading(true)
    fetch(`/api/presences?classe_id=${classeId}&date=${date}`)
      .then(r => r.json())
      .then(d => {
        setEleves(d.eleves || [])
        const map: Record<string, Statut> = {}
        d.eleves?.forEach((e: ElevePresence) => {
          map[e.id] = (e.statut as Statut) || 'present'
        })
        setPresences(map)
        setLoading(false)
      })
  }, [classeId, date])

  const filteredEleves = useMemo(() => {
    let list = eleves
    const q = debouncedValues.q?.toLowerCase().trim()
    if (q) {
      list = list.filter(e =>
        `${e.nom} ${e.prenom} ${e.numero_matricule}`.toLowerCase().includes(q)
      )
    }
    const statutFiltre = debouncedValues.statut
    if (statutFiltre && statutFiltre !== 'tous') {
      list = list.filter(e => presences[e.id] === statutFiltre)
    }
    return list
  }, [eleves, debouncedValues.q, debouncedValues.statut, presences])

  const setTousPresents = () => {
    const map: Record<string, Statut> = {}
    eleves.forEach(e => { map[e.id] = 'present' })
    setPresences(map)
  }

  const toggleStatut = (eleveId: string, statut: Statut) => {
    setPresences(prev => ({ ...prev, [eleveId]: statut }))
  }

  const handleSave = async () => {
    setSaving(true)
    const data = Object.entries(presences).map(([eleve_id, statut]) => ({
      eleve_id, statut, note: null,
    }))
    await fetch('/api/presences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, presences: data }),
    })
    setSaving(false)
    setSaved(true)
    toast.success('Appel enregistré')
    setTimeout(() => setSaved(false), 2000)
  }

  const stats = {
    present: Object.values(presences).filter(s => s === 'present').length,
    absent: Object.values(presences).filter(s => s === 'absent').length,
    retard: Object.values(presences).filter(s => s === 'retard').length,
    excuse: Object.values(presences).filter(s => s === 'excuse').length,
  }

  const statutConfig: Record<Statut, { label: string; active: string; inactive: string }> = {
    present: { label: 'Présent', active: 'bg-emerald-500 text-white', inactive: 'bg-slate-100 text-slate-500 hover:bg-emerald-50' },
    absent: { label: 'Absent', active: 'bg-red-500 text-white', inactive: 'bg-slate-100 text-slate-500 hover:bg-red-50' },
    retard: { label: 'Retard', active: 'bg-amber-500 text-white', inactive: 'bg-slate-100 text-slate-500 hover:bg-amber-50' },
    excuse: { label: 'Excusé', active: 'bg-blue-500 text-white', inactive: 'bg-slate-100 text-slate-500 hover:bg-blue-50' },
  }

  return (
    <PageShell title="Présences" subtitle="Registre d'appel quotidien par classe" breadcrumb="Présences">
      <SmartFilterBar
        fields={fields}
        values={values}
        onChange={setFilter}
        onReset={reset}
        activeFilters={activeFilters}
        resultCount={classeId ? filteredEleves.length : undefined}
        resultLabel="élève(s)"
        loading={loading}
        extra={
          <div className="flex flex-wrap gap-1.5">
            {PRESENCE_DATE_PRESETS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => setFilter('date', dateWithOffset(p.offset))}
                className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                {p.label}
              </button>
            ))}
            {eleves.length > 0 && (
              <>
                <button onClick={setTousPresents}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                  Tous présents
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé !' : "Valider l'appel"}
                </button>
              </>
            )}
          </div>
        }
        className="mb-4"
      />

      {student && <StudentContextBanner slug={slug} student={student} className="mb-6" />}

      {eleves.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {Object.entries(stats).map(([key, val]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter('statut', key === values.statut ? 'tous' : key)}
              className={`bg-white rounded-lg border px-4 py-3 flex items-center justify-between transition-colors ${
                values.statut === key ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-sm text-slate-500 capitalize">
                {key === 'present' ? 'Présents' : key === 'absent' ? 'Absents' : key === 'retard' ? 'Retards' : 'Excusés'}
              </span>
              <span className="font-bold text-slate-800">{val}</span>
            </button>
          ))}
        </div>
      )}

      {!classeId ? (
        <div className="card p-12 text-center text-slate-400 text-sm">Sélectionnez une classe pour faire l&apos;appel</div>
      ) : loading ? (
        <div className="card p-12 text-center text-slate-400 text-sm">Chargement...</div>
      ) : filteredEleves.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Aucun élève trouvé"
          description="Modifiez la date, la classe ou la recherche pour afficher des élèves."
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Élève</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEleves.map((eleve, i) => (
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
                    <div className="flex gap-2 flex-wrap">
                      {(Object.keys(statutConfig) as Statut[]).map(s => (
                        <button key={s} onClick={() => toggleStatut(eleve.id, s)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                            presences[eleve.id] === s ? statutConfig[s].active : statutConfig[s].inactive
                          }`}>
                          {statutConfig[s].label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  )
}

export default function PresencesPage() {
  return (
    <Suspense fallback={<PageShell title="Présences" breadcrumb="Présences"><div className="card p-12 text-center text-slate-400">Chargement...</div></PageShell>}>
      <PresencesPageContent />
    </Suspense>
  )
}
