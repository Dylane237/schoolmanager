'use client'

import { Suspense, useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Trash2, Save, ChevronDown, Settings, X, Check, Printer, Sprout } from 'lucide-react'
import SmartFilterBar from '@/components/filters/SmartFilterBar'
import StudentContextBanner from '@/components/students/StudentContextBanner'
import EmptyState from '@/components/ui/EmptyState'
import { useSmartFilters } from '@/hooks/useSmartFilters'
import { useStudentDeepLink } from '@/hooks/useStudentDeepLink'

interface Eleve {
  id: string
  nom: string
  prenom: string
  numero_matricule: string
  classe_nom: string
}

interface Classe {
  id: string
  nom: string
}

interface Competence {
  eleve_id: string
  periode: string
  domaine: string
  competence: string
  statut: 'acquis' | 'en_cours' | 'non_acquis'
  observation: string
}

interface Domaine {
  nom: string
  competences: string[]
}

const PERIODES = [
  { value: 'sequence1', label: 'Séquence 1' },
  { value: 'sequence2', label: 'Séquence 2' },
  { value: 'sequence3', label: 'Séquence 3' },
  { value: 'sequence4', label: 'Séquence 4' },
  { value: 'sequence5', label: 'Séquence 5' },
  { value: 'sequence6', label: 'Séquence 6' },
]

const STATUTS = [
  { value: 'acquis',     label: 'Acquis',    color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'en_cours',  label: 'En cours',  color: 'bg-amber-500',   light: 'bg-amber-50 text-amber-700 border-amber-200'       },
  { value: 'non_acquis',label: 'Non acquis',color: 'bg-red-500',     light: 'bg-red-50 text-red-700 border-red-200'             },
]

export default function MaternellePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Chargement...</div>}>
      <MaternellePageContent />
    </Suspense>
  )
}

function MaternellePageContent() {
  const { slug } = useParams() as { slug: string }

  const [eleves, setEleves] = useState<Eleve[]>([])
  const [classes, setClasses] = useState<Classe[]>([])
  const [domaines, setDomaines] = useState<Domaine[]>([])
  const [competences, setCompetences] = useState<Competence[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const filterFields = useMemo(() => [
    {
      key: 'classe',
      type: 'select' as const,
      label: 'Classe',
      options: [
        { value: '', label: 'Toutes les classes maternelle' },
        ...classes.map(c => ({ value: c.id, label: c.nom })),
      ],
      defaultValue: '',
    },
    {
      key: 'eleve',
      type: 'select' as const,
      label: 'Élève',
      options: [
        { value: '', label: 'Tous les élèves' },
        ...eleves.map(e => ({ value: e.id, label: `${e.nom} ${e.prenom}` })),
      ],
      defaultValue: '',
    },
    {
      key: 'periode',
      type: 'pills' as const,
      label: 'Séquence',
      options: PERIODES.map(p => ({ value: p.value, label: p.label })),
      defaultValue: 'sequence1',
    },
  ], [classes, eleves])

  const { values, setFilter, setFilters, reset, activeFilters } = useSmartFilters(filterFields)
  const { student } = useStudentDeepLink(setFilters, {
    apply: s => {
      const patch: Record<string, string> = { eleve: s.id }
      if (s.classe_id) patch.classe = s.classe_id
      return patch
    },
  })

  const classeId = values.classe ?? ''
  const eleveId = values.eleve ?? ''
  const periode = values.periode || 'sequence1'

  const [showSettings, setShowSettings] = useState(false)
  const [domainesEdit, setDomainesEdit] = useState<Domaine[]>([])
  const [savingDomaines, setSavingDomaines] = useState(false)
  const [newDomaine, setNewDomaine] = useState('')
  const [newCompetences, setNewCompetences] = useState<{ [key: number]: string }>({})
  const [domainesOpen, setDomainesOpen] = useState<{ [key: number]: boolean }>({})

  const handleClasseChange = (key: string, value: string) => {
    if (key === 'classe') {
      setFilter('classe', value)
      setFilter('eleve', '')
      return
    }
    setFilter(key, value)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ periode })
    if (classeId) params.set('classe_id', classeId)
    if (eleveId) params.set('eleve_id', eleveId)

    const res = await fetch(`/api/maternelle?${params}`)
    const data = await res.json()
    setEleves(data.eleves || [])
    setClasses(data.classes || [])
    setDomaines(data.domaines || [])
    setCompetences(data.competences || [])
    setLoading(false)
  }, [classeId, eleveId, periode])

  useEffect(() => { fetchData() }, [fetchData])

  const getStatut = (eleve_id: string, domaine: string, competence: string) => {
    return competences.find(
      c => c.eleve_id === eleve_id && c.domaine === domaine && c.competence === competence
    )?.statut || null
  }

  const handleStatut = async (eleve_id: string, domaine: string, competence: string, statut: string) => {
    const key = `${eleve_id}-${domaine}-${competence}`
    setSaving(key)
    await fetch('/api/maternelle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eleve_id, domaine, competence, statut, periode }),
    })
    await fetchData()
    setSaving(null)
  }

  const cycleStatut = (eleve_id: string, domaine: string, competence: string) => {
    const current = getStatut(eleve_id, domaine, competence)
    const order = [null, 'non_acquis', 'en_cours', 'acquis']
    const idx = order.indexOf(current)
    const next = order[(idx + 1) % order.length]
    if (next) handleStatut(eleve_id, domaine, competence, next)
    else handleStatut(eleve_id, domaine, competence, 'non_acquis')
  }

  const StatutBadge = ({ eleve_id, domaine, competence }: { eleve_id: string; domaine: string; competence: string }) => {
    const statut = getStatut(eleve_id, domaine, competence)
    const key = `${eleve_id}-${domaine}-${competence}`
    const isSaving = saving === key
    const s = STATUTS.find(s => s.value === statut)

    return (
      <button
        onClick={() => cycleStatut(eleve_id, domaine, competence)}
        disabled={isSaving}
        className={`w-24 text-xs font-semibold px-2 py-1.5 rounded-lg border transition-all ${
          s ? s.light : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
        } ${isSaving ? 'opacity-50' : 'hover:opacity-80'}`}
      >
        {isSaving ? '...' : (s ? s.label : 'Non évalué')}
      </button>
    )
  }

  // Stats rapides par élève
  const getStats = (eleve_id: string) => {
    const cs = competences.filter(c => c.eleve_id === eleve_id)
    return {
      acquis: cs.filter(c => c.statut === 'acquis').length,
      en_cours: cs.filter(c => c.statut === 'en_cours').length,
      non_acquis: cs.filter(c => c.statut === 'non_acquis').length,
    }
  }

  // Settings domaines
  const openSettings = () => {
    setDomainesEdit(JSON.parse(JSON.stringify(domaines)))
    setShowSettings(true)
  }

  const saveDomaines = async () => {
    setSavingDomaines(true)
    await fetch('/api/maternelle', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domaines: domainesEdit }),
    })
    await fetchData()
    setSavingDomaines(false)
    setShowSettings(false)
  }

  const addDomaine = () => {
    if (!newDomaine.trim()) return
    setDomainesEdit(prev => [...prev, { nom: newDomaine.trim(), competences: [] }])
    setNewDomaine('')
  }

  const removeDomaine = (i: number) => {
    setDomainesEdit(prev => prev.filter((_, idx) => idx !== i))
  }

  const addCompetence = (domaineIdx: number) => {
    const val = newCompetences[domaineIdx]?.trim()
    if (!val) return
    setDomainesEdit(prev => {
      const copy = [...prev]
      copy[domaineIdx] = { ...copy[domaineIdx], competences: [...copy[domaineIdx].competences, val] }
      return copy
    })
    setNewCompetences(prev => ({ ...prev, [domaineIdx]: '' }))
  }

  const removeCompetence = (domaineIdx: number, compIdx: number) => {
    setDomainesEdit(prev => {
      const copy = [...prev]
      copy[domaineIdx] = {
        ...copy[domaineIdx],
        competences: copy[domaineIdx].competences.filter((_, i) => i !== compIdx)
      }
      return copy
    })
  }

  const elevesFiltres = eleveId
    ? eleves.filter(e => e.id === eleveId)
    : eleves

  const periodeLabel = PERIODES.find(p => p.value === periode)?.label || periode

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Livret Maternelle</h1>
          <p className="text-slate-500 text-sm mt-1">Évaluation des compétences par domaine</p>
        </div>
        <div className="flex gap-2">
          {eleveId && (
            <button onClick={handlePrint}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm transition-colors print:hidden">
              <Printer className="w-4 h-4" /> Imprimer le livret
            </button>
          )}
          <button onClick={openSettings}
            className="flex items-center gap-2 border border-slate-200 hover:border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm transition-colors print:hidden">
            <Settings className="w-4 h-4" /> Domaines
          </button>
        </div>
      </div>

      <SmartFilterBar
        fields={filterFields}
        values={values}
        onChange={handleClasseChange}
        onReset={reset}
        activeFilters={activeFilters}
        resultCount={elevesFiltres.length}
        resultLabel="élève(s)"
        loading={loading}
        className="mb-6"
      />

      {student && (
        <StudentContextBanner slug={slug} student={student} className="mb-6" />
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Chargement...</div>
      ) : elevesFiltres.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="Aucun élève maternelle"
          description="Inscrivez des élèves en section maternelle ou modifiez vos filtres."
        />
      ) : eleveId ? (
        /* Vue détaillée un élève */
        <div className="space-y-4 print-area" id="livret-print">
          {(() => {
            const eleve = elevesFiltres[0]
            const stats = getStats(eleve.id)
            return (
              <>
                <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
                  <h1 className="text-xl font-bold">Livret de compétences — Maternelle</h1>
                  <p className="text-sm mt-1">{eleve.nom} {eleve.prenom} · {eleve.classe_nom} · {periodeLabel}</p>
                  <p className="text-xs text-slate-500 mt-1">Matricule : {eleve.numero_matricule || '—'}</p>
                </div>
                {/* Stats élève */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-6 print:border-0 print:p-0">
                  <div>
                    <p className="font-bold text-slate-800">{eleve.nom} {eleve.prenom}</p>
                    <p className="text-xs text-slate-400">{eleve.classe_nom}</p>
                  </div>
                  <div className="ml-auto flex gap-4">
                    {[
                      { label: 'Acquis', val: stats.acquis, color: 'text-emerald-600' },
                      { label: 'En cours', val: stats.en_cours, color: 'text-amber-600' },
                      { label: 'Non acquis', val: stats.non_acquis, color: 'text-red-600' },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                        <p className="text-xs text-slate-500">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Domaines */}
                {domaines.map((domaine, di) => (
                  <div key={di} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                      <h2 className="font-semibold text-slate-700 text-sm">{domaine.nom}</h2>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {domaine.competences.map((comp, ci) => (
                        <div key={ci} className="flex items-center justify-between px-4 py-3">
                          <p className="text-sm text-slate-700 flex-1 pr-4">{comp}</p>
                          <span className="print:hidden">
                            <StatutBadge eleve_id={eleve.id} domaine={domaine.nom} competence={comp} />
                          </span>
                          <span className="hidden print:inline text-xs font-semibold">
                            {STATUTS.find(s => s.value === getStatut(eleve.id, domaine.nom, comp))?.label || 'Non évalué'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )
          })()}
        </div>
      ) : (
        /* Vue grille tous les élèves */
        <div className="space-y-8">
          {domaines.map((domaine, di) => (
            <div key={di} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
                <h2 className="font-semibold text-slate-700">{domaine.nom}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-100">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 w-48">Compétence</th>
                      {elevesFiltres.map(e => (
                        <th key={e.id} className="text-center px-2 py-2 text-xs font-medium text-slate-600 min-w-28">
                          <button onClick={() => setFilter('eleve', e.id)} className="hover:text-emerald-600 transition-colors">
                            {e.nom} {e.prenom.charAt(0)}.
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {domaine.competences.map((comp, ci) => (
                      <tr key={ci} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-xs text-slate-600">{comp}</td>
                        {elevesFiltres.map(e => (
                          <td key={e.id} className="px-2 py-2 text-center">
                            <StatutBadge eleve_id={e.id} domaine={domaine.nom} competence={comp} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Settings Domaines */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="font-bold text-slate-800">Gérer les domaines de compétences</h2>
              <button onClick={() => setShowSettings(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {domainesEdit.map((domaine, di) => (
                <div key={di} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                    <button onClick={() => setDomainesOpen(p => ({ ...p, [di]: !p[di] }))}
                      className="flex items-center gap-2 text-sm font-semibold text-slate-700 flex-1 text-left">
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${domainesOpen[di] ? 'rotate-180' : ''}`} />
                      {domaine.nom}
                      <span className="text-xs font-normal text-slate-400">({domaine.competences.length})</span>
                    </button>
                    <button onClick={() => removeDomaine(di)}
                      className="text-slate-300 hover:text-red-500 transition-colors ml-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {domainesOpen[di] && (
                    <div className="p-4 space-y-2">
                      {domaine.competences.map((comp, ci) => (
                        <div key={ci} className="flex items-center gap-2 group">
                          <span className="text-sm text-slate-600 flex-1">{comp}</span>
                          <button onClick={() => removeCompetence(di, ci)}
                            className="text-slate-200 group-hover:text-red-400 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-3">
                        <input
                          value={newCompetences[di] || ''}
                          onChange={e => setNewCompetences(p => ({ ...p, [di]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addCompetence(di)}
                          placeholder="Nouvelle compétence..."
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                        <button onClick={() => addCompetence(di)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-sm transition-colors">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Ajouter domaine */}
              <div className="flex gap-2 pt-2">
                <input
                  value={newDomaine}
                  onChange={e => setNewDomaine(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addDomaine()}
                  placeholder="Nom du nouveau domaine..."
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button onClick={addDomaine}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-200">
              <button onClick={() => setShowSettings(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={saveDomaines} disabled={savingDomaines}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
                <Save className="w-4 h-4" />
                {savingDomaines ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}