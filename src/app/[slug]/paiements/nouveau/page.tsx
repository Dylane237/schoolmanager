'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Check, Search } from 'lucide-react'
import RecuPrint, { type RecuData } from '@/components/paiements/RecuPrint'
import PageShell from '@/components/layout/PageShell'
import type { EleveSituation } from '@/lib/paiements-utils'

interface Eleve {
  id: string
  nom: string
  prenom: string
  numero_matricule: string
  classe_nom: string
  total_paye: number
  total_attendu: number
}

export default function NouveauPaiementPage() {
  const { slug } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [eleveSelectionne, setEleveSelectionne] = useState<Eleve | null>(null)
  const [situation, setSituation] = useState<EleveSituation | null>(null)
  const [recu, setRecu] = useState<RecuData | null>(null)

  const [form, setForm] = useState({
    eleve_id: '',
    tranche_numero: '1',
    montant: '',
    mode_paiement: 'especes',
    date_paiement: new Date().toISOString().split('T')[0],
  })

  const up = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  useEffect(() => {
    if (search.length < 2) { setEleves([]); return }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/eleves?search=${search}`)
      const data = await res.json()
      setEleves(data.eleves || [])
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!eleveSelectionne) {
      setSituation(null)
      return
    }
    fetch(`/api/paiements?view=situation&eleve_id=${eleveSelectionne.id}`)
      .then(r => r.json())
      .then(data => {
        const s = data.situation as EleveSituation | null
        setSituation(s)
        if (s?.tranches.length) {
          const firstDue = s.tranches.find(t => t.reste > 0) ?? s.tranches[0]
          setForm(prev => ({
            ...prev,
            tranche_numero: String(firstDue.tranche_numero),
            montant: firstDue.reste > 0 ? String(firstDue.reste) : '',
          }))
        }
      })
  }, [eleveSelectionne])

  const selectEleve = (eleve: Eleve) => {
    setEleveSelectionne(eleve)
    setForm(prev => ({ ...prev, eleve_id: eleve.id, tranche_numero: '1', montant: '' }))
    setSearch('')
    setEleves([])
  }

  const trancheActive = situation?.tranches.find(
    t => t.tranche_numero === Number(form.tranche_numero),
  )

  const handleTrancheChange = (numero: string) => {
    up('tranche_numero', numero)
    const t = situation?.tranches.find(tr => tr.tranche_numero === Number(numero))
    if (t && t.reste > 0) up('montant', String(t.reste))
  }

  const handleSubmit = async () => {
    if (!form.eleve_id || !form.montant) {
      setError('Sélectionnez un élève et saisissez un montant')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/paiements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erreur lors de l\'enregistrement')
      setLoading(false)
      return
    }

    setRecu(data.recu)
    setLoading(false)
  }

  const totalAttendu = situation?.total_attendu ?? eleveSelectionne?.total_attendu ?? 0
  const totalPaye = situation?.total_paye ?? eleveSelectionne?.total_paye ?? 0
  const reste = situation?.total_reste ?? (totalAttendu - totalPaye)

  return (
    <PageShell title="Enregistrer un paiement" breadcrumb="Nouveau paiement" subtitle="Saisie et impression du reçu">
      <div className="max-w-2xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-base">
          {error}
        </div>
      )}

      <div className="card p-6 space-y-5">
        <div>
          <label className="block text-base font-medium text-slate-700 mb-1">Élève *</label>
          {eleveSelectionne ? (
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div>
                <p className="font-semibold text-slate-800 text-base">
                  {eleveSelectionne.nom} {eleveSelectionne.prenom}
                </p>
                <p className="text-sm text-slate-500">
                  {eleveSelectionne.numero_matricule} — {eleveSelectionne.classe_nom}
                </p>
              </div>
              <button onClick={() => { setEleveSelectionne(null); setSituation(null); setForm(p => ({ ...p, eleve_id: '' })) }}
                className="text-sm text-slate-400 hover:text-slate-600">
                Changer
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Rechercher un élève par nom ou matricule..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 text-base focus:outline-none"
                />
              </div>
              {eleves.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg mt-1 z-10 max-h-48 overflow-y-auto">
                  {eleves.map(eleve => (
                    <button key={eleve.id} onClick={() => selectEleve(eleve)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                      <p className="font-medium text-slate-800 text-base">
                        {eleve.nom} {eleve.prenom}
                      </p>
                      <p className="text-sm text-slate-400">
                        {eleve.numero_matricule} — {eleve.classe_nom || 'Aucune classe'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {eleveSelectionne && (
          <>
            <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg text-center">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total attendu</p>
                <p className="font-bold text-slate-800 text-base">
                  {Number(totalAttendu).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Déjà payé</p>
                <p className="font-bold text-emerald-600 text-base">
                  {Number(totalPaye).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Reste dû</p>
                <p className={`font-bold text-base ${reste > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {Number(reste).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>

            {situation && situation.tranches.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600">Détail par tranche</p>
                <div className="grid gap-2">
                  {situation.tranches.map(t => (
                    <div
                      key={t.tranche_numero}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${
                        Number(form.tranche_numero) === t.tranche_numero
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <span className="font-semibold text-slate-700">Tranche {t.tranche_numero}</span>
                      <span className="text-slate-500">
                        {Number(t.montant_paye).toLocaleString('fr-FR')} / {Number(t.montant_attendu).toLocaleString('fr-FR')} FCFA
                      </span>
                      <span className={t.reste > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}>
                        {t.reste > 0 ? `Reste ${Number(t.reste).toLocaleString('fr-FR')}` : 'Soldé'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-base font-medium text-slate-700 mb-1">Tranche *</label>
            <select
              value={form.tranche_numero}
              onChange={e => handleTrancheChange(e.target.value)}
              className="input-field"
              disabled={!eleveSelectionne}
            >
              {(situation?.tranches.length ? situation.tranches : [{ tranche_numero: 1 }, { tranche_numero: 2 }, { tranche_numero: 3 }]).map(t => (
                <option key={t.tranche_numero} value={t.tranche_numero}>
                  Tranche {t.tranche_numero}
                  {'montant_attendu' in t && t.montant_attendu
                    ? ` — ${Number(t.montant_attendu).toLocaleString('fr-FR')} FCFA`
                    : ''}
                </option>
              ))}
            </select>
            {trancheActive && (
              <p className="text-xs text-slate-500 mt-1">
                Reste sur cette tranche : {Number(trancheActive.reste).toLocaleString('fr-FR')} FCFA
              </p>
            )}
          </div>
          <div>
            <label className="block text-base font-medium text-slate-700 mb-1">Montant (FCFA) *</label>
            <input type="number" value={form.montant} onChange={e => up('montant', e.target.value)}
              placeholder="50000"
              className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-base font-medium text-slate-700 mb-1">Mode de paiement *</label>
            <select value={form.mode_paiement} onChange={e => up('mode_paiement', e.target.value)}
              className="input-field">
              <option value="especes">Espèces</option>
              <option value="orange_money">Orange Money</option>
              <option value="mtn_momo">MTN MoMo</option>
              <option value="virement">Virement</option>
            </select>
          </div>
          <div>
            <label className="block text-base font-medium text-slate-700 mb-1">Date</label>
            <input type="date" value={form.date_paiement} onChange={e => up('date_paiement', e.target.value)}
              className="input-field" />
          </div>
        </div>

        <button onClick={handleSubmit}
          disabled={loading || !form.eleve_id || !form.montant}
          className="w-full btn-primary flex items-center justify-center gap-2">
          {loading ? 'Enregistrement...' : <><Check className="w-5 h-5" /> Enregistrer le paiement</>}
        </button>
      </div>

      {recu && (
        <RecuPrint
          recu={recu}
          onClose={() => router.push(`/${slug}/paiements`)}
        />
      )}
      </div>
    </PageShell>
  )
}
