'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, UserX } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import SmartFilterBar from '@/components/filters/SmartFilterBar'
import { useSmartFilters } from '@/hooks/useSmartFilters'
import { useClasses } from '@/hooks/useClasses'
import {
  ELEVE_PRESETS,
  SECTION_OPTIONS,
  STATUT_PAIEMENT_OPTIONS,
} from '@/lib/filter-presets'

interface Eleve {
  id: string
  numero_matricule: string
  nom: string
  prenom: string
  sexe: string
  section: string
  classe_nom: string
  photo_url: string | null
  parent_nom: string
  parent_telephone: string
  total_paye: number
  total_attendu: number
}

const FILTER_FIELDS = [
  {
    key: 'q',
    type: 'search' as const,
    placeholder: 'Rechercher par nom, prénom, matricule, parent...',
    debounce: true,
  },
  {
    key: 'section',
    type: 'select' as const,
    label: 'Section',
    options: SECTION_OPTIONS,
    defaultValue: '',
  },
  {
    key: 'classe',
    type: 'select' as const,
    label: 'Classe',
    options: [{ value: '', label: 'Toutes les classes' }],
    defaultValue: '',
  },
  {
    key: 'statut',
    type: 'select' as const,
    label: 'Paiement',
    options: STATUT_PAIEMENT_OPTIONS,
    defaultValue: 'tous',
  },
]

function ElevesPageContent() {
  const { slug } = useParams()
  const router = useRouter()
  const { classes } = useClasses()
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [loading, setLoading] = useState(true)

  const fields = useMemo(() => {
    const classeOptions = [
      { value: '', label: 'Toutes les classes' },
      { value: '__none__', label: 'Sans classe' },
      ...classes.map(c => ({ value: c.id, label: c.nom })),
    ]
    return FILTER_FIELDS.map(f =>
      f.key === 'classe' ? { ...f, options: classeOptions } : f
    )
  }, [classes])

  const {
    values,
    debouncedValues,
    setFilter,
    applyPreset,
    reset,
    activeFilters,
  } = useSmartFilters(fields)

  const fetchEleves = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedValues.q) params.set('search', debouncedValues.q)
    if (debouncedValues.section) params.set('section', debouncedValues.section)
    if (debouncedValues.classe) params.set('classe_id', debouncedValues.classe)
    if (debouncedValues.statut && debouncedValues.statut !== 'tous') {
      params.set('statut_paiement', debouncedValues.statut)
    }

    const res = await fetch(`/api/eleves?${params}`)
    const data = await res.json()
    setEleves(data.eleves || [])
    setLoading(false)
  }, [debouncedValues])

  useEffect(() => { fetchEleves() }, [fetchEleves])

  const getStatutPaiement = (paye: number, attendu: number) => {
    if (attendu === 0) return { label: 'N/A', variant: 'neutral' as const }
    const reste = attendu - paye
    if (reste <= 0) return { label: 'Soldé', variant: 'success' as const }
    if (paye > 0) return { label: 'Partiel', variant: 'warning' as const }
    return { label: 'Impayé', variant: 'danger' as const }
  }

  return (
    <PageShell
      title="Élèves"
      subtitle={`${eleves.length} élève(s) inscrit(s)`}
      breadcrumb="Élèves"
      actions={
        <button onClick={() => router.push(`/${slug}/eleves/nouveau`)}
          className="btn-primary flex items-center gap-2 py-2.5">
          <Plus className="w-5 h-5" /> Nouvel élève
        </button>
      }
    >
      <SmartFilterBar
        fields={fields}
        values={values}
        onChange={setFilter}
        onReset={reset}
        activeFilters={activeFilters}
        presets={ELEVE_PRESETS}
        onPreset={applyPreset}
        resultCount={eleves.length}
        resultLabel="élève(s)"
        loading={loading}
        className="mb-6"
      />

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-base">Chargement...</div>
        ) : eleves.length === 0 ? (
          <EmptyState
            icon={UserX}
            title="Aucun élève trouvé"
            description="Modifiez vos filtres ou inscrivez votre premier élève."
            action={
              <button onClick={() => router.push(`/${slug}/eleves/nouveau`)} className="btn-primary">
                Inscrire un élève
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Élève', 'Matricule', 'Classe', 'Section', 'Contact parent', 'Paiement', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3.5 text-sm font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eleves.map((eleve) => {
                  const statut = getStatutPaiement(eleve.total_paye, eleve.total_attendu)
                  return (
                    <tr key={eleve.id}
                      onClick={() => router.push(`/${slug}/eleves/${eleve.id}`)}
                      className="hover:bg-emerald-50/50 transition-colors cursor-pointer group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                            {eleve.photo_url ? (
                              <img src={eleve.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-bold">
                                {eleve.prenom[0]}{eleve.nom[0]}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-base group-hover:text-emerald-700 transition-colors">
                              {eleve.nom} {eleve.prenom}
                            </p>
                            <p className="text-sm text-slate-400">{eleve.sexe === 'M' ? 'Masculin' : 'Féminin'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-sm text-slate-500">{eleve.numero_matricule}</td>
                      <td className="px-5 py-4 text-base text-slate-600">{eleve.classe_nom || '—'}</td>
                      <td className="px-5 py-4">
                        <Badge variant="neutral">{eleve.section || '—'}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-base text-slate-700">{eleve.parent_nom || '—'}</p>
                        <p className="text-sm text-slate-400">{eleve.parent_telephone}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={statut.variant}>{statut.label}</Badge>
                      </td>
                      <td className="px-5 py-4 text-emerald-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Voir fiche →
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  )
}

export default function ElevesPage() {
  return (
    <Suspense fallback={
      <PageShell title="Élèves" breadcrumb="Élèves">
        <div className="card p-16 text-center text-slate-400">Chargement des filtres...</div>
      </PageShell>
    }>
      <ElevesPageContent />
    </Suspense>
  )
}
