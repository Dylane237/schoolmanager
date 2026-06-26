'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Plus, TrendingUp, AlertCircle, Calendar, Clock, History, Users } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import SituationParEleve from '@/components/paiements/SituationParEleve'
import type { EleveSituation } from '@/lib/paiements-utils'

interface Paiement {
  id: string
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

export default function PaiementsPage() {
  const { slug } = useParams()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('situation')
  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [situations, setSituations] = useState<EleveSituation[]>([])
  const [retards, setRetards] = useState<Retard[]>([])
  const [stats, setStats] = useState<Stats>({ today: 0, mois: 0, impaye: 0, retards: 0, retardsCritiques: 0 })
  const [loading, setLoading] = useState(true)
  const [mois, setMois] = useState(new Date().toISOString().slice(0, 7))
  const [search, setSearch] = useState('')
  const [classeId, setClasseId] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [classes, setClasses] = useState<{ id: string; nom: string }[]>([])
  const [anneeScolaire, setAnneeScolaire] = useState('')

  const fetchHistorique = useCallback(async () => {
    const res = await fetch(`/api/paiements?mois=${mois}`)
    const data = await res.json()
    setPaiements(data.paiements || [])
    setStats(data.stats || { today: 0, mois: 0, impaye: 0, retards: 0, retardsCritiques: 0 })
    setRetards(data.retards || [])
  }, [mois])

  const [searchDebounced, setSearchDebounced] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const fetchSituation = useCallback(async () => {
    const params = new URLSearchParams({ view: 'situation' })
    if (searchDebounced) params.set('search', searchDebounced)
    if (classeId) params.set('classe_id', classeId)
    const res = await fetch(`/api/paiements?${params}`)
    const data = await res.json()
    setSituations(data.situations || [])
    setAnneeScolaire(data.annee_scolaire || '')
  }, [searchDebounced, classeId])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([fetchHistorique(), fetchSituation()])
    setLoading(false)
  }, [fetchHistorique, fetchSituation])

  useEffect(() => {
    fetch('/api/tranches-config')
      .then(r => r.json())
      .then(d => setClasses(d.classes || []))
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const modePaiementLabel = (mode: string) => {
    const map: Record<string, string> = {
      especes: 'Espèces',
      orange_money: 'Orange Money',
      mtn_momo: 'MTN MoMo',
      virement: 'Virement',
    }
    return map[mode] || mode
  }

  const retardsCritiques = retards.filter(r => r.jours_retard >= 3)

  return (
    <PageShell
      title="Paiements"
      subtitle="Suivi des frais de scolarité par tranche"
      breadcrumb="Paiements"
      actions={
        <button
          onClick={() => router.push(`/${slug}/paiements/nouveau`)}
          className="btn-primary flex items-center gap-2 py-2.5">
          <Plus className="w-5 h-5" />
          Enregistrer un paiement
        </button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-base text-slate-500">Aujourd&apos;hui</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {Number(stats.today).toLocaleString('fr-FR')} FCFA
          </p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-base text-slate-500">Ce mois</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {Number(stats.mois).toLocaleString('fr-FR')} FCFA
          </p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-base text-slate-500">Soldes impayés</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{stats.impaye} élève(s)</p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-base text-slate-500">Retards (+3j)</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats.retardsCritiques}</p>
        </div>
      </div>

      {retardsCritiques.length > 0 && (
        <div className="card mb-6 overflow-hidden border-amber-200">
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-amber-800 text-base">
              Paiements en retard ({retardsCritiques.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Élève', 'Classe', 'Tranche', 'Reste dû', 'Date limite', 'Retard'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-sm font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {retardsCritiques.map(r => (
                  <tr key={`${r.eleve_id}-${r.tranche_numero}`} className="hover:bg-amber-50/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 text-base">{r.nom} {r.prenom}</p>
                      <p className="text-sm text-slate-400">{r.numero_matricule}</p>
                    </td>
                    <td className="px-4 py-3 text-base text-slate-600">{r.classe_nom}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                        Tranche {r.tranche_numero}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-red-600 text-base">
                      {(r.montant_attendu - r.montant_paye).toLocaleString('fr-FR')} FCFA
                    </td>
                    <td className="px-4 py-3 text-base text-slate-500">{r.date_limite}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                        +{r.jours_retard} jours
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-6 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setTab('situation')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === 'situation' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Situation par élève
        </button>
        <button
          type="button"
          onClick={() => setTab('historique')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            tab === 'historique' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <History className="w-4 h-4" />
          Historique
        </button>
      </div>

      {tab === 'situation' ? (
        <>
          <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder="Rechercher un élève..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field max-w-xs"
            />
            <select
              value={classeId}
              onChange={e => setClasseId(e.target.value)}
              className="input-field w-auto min-w-[180px]"
            >
              <option value="">Toutes les classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
            {anneeScolaire && (
              <span className="text-sm text-slate-400 ml-auto">Année {anneeScolaire}</span>
            )}
          </div>
          <SituationParEleve
            situations={situations}
            loading={loading}
            filtreStatut={filtreStatut}
            onFiltreStatutChange={setFiltreStatut}
          />
        </>
      ) : (
        <>
          <div className="card p-4 mb-6 flex items-center gap-4">
            <label className="text-base font-medium text-slate-600">Filtrer par mois :</label>
            <input type="month" value={mois} onChange={e => setMois(e.target.value)} className="input-field w-auto" />
            <span className="text-base text-slate-400">{paiements.length} paiement(s)</span>
          </div>
          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-base">Chargement...</div>
            ) : paiements.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-base">Aucun paiement pour cette période</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Reçu', 'Élève', 'Classe', 'Tranche', 'Montant', 'Mode', 'Date'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-sm font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paiements.map((p, i) => (
                      <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                        <td className="px-4 py-3 font-mono text-sm text-slate-500">{p.recu_numero}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800 text-base">{p.eleve_nom} {p.eleve_prenom}</p>
                          <p className="text-sm text-slate-400">{p.numero_matricule}</p>
                        </td>
                        <td className="px-4 py-3 text-base text-slate-600">{p.classe_nom || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                            Tranche {p.tranche_numero}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 text-base">
                          {Number(p.montant).toLocaleString('fr-FR')} FCFA
                        </td>
                        <td className="px-4 py-3 text-base text-slate-600">{modePaiementLabel(p.mode_paiement)}</td>
                        <td className="px-4 py-3 text-base text-slate-500">{p.date_paiement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </PageShell>
  )
}
