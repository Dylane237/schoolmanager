'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Search, Plus, UserX } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

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

export default function ElevesPage() {
  const { slug } = useParams()
  const router = useRouter()
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [filtreSection, setFiltreSection] = useState('')

  const fetchEleves = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (filtreStatut !== 'tous') params.set('statut_paiement', filtreStatut)
    if (filtreSection) params.set('section', filtreSection)

    const res = await fetch(`/api/eleves?${params}`)
    const data = await res.json()
    setEleves(data.eleves || [])
    setLoading(false)
  }, [search, filtreStatut, filtreSection])

  useEffect(() => {
    const timer = setTimeout(fetchEleves, 300)
    return () => clearTimeout(timer)
  }, [fetchEleves])

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
      <div className="card p-4 mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] border border-slate-200 rounded-xl px-4 py-2.5 bg-white">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom, matricule..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 text-base focus:outline-none text-slate-700 placeholder-slate-400 bg-transparent"
          />
        </div>
        <select value={filtreSection} onChange={e => setFiltreSection(e.target.value)} className="input-field w-auto min-w-[180px]">
          <option value="">Toutes les sections</option>
          <option value="francophone">Francophone</option>
          <option value="anglophone">Anglophone</option>
          <option value="maternelle">Maternelle</option>
        </select>
        <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)} className="input-field w-auto min-w-[180px]">
          <option value="tous">Tous les paiements</option>
          <option value="paye">Soldé</option>
          <option value="partiel">Partiel</option>
          <option value="impaye">Impayé</option>
        </select>
      </div>

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
