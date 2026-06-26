'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Check, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import PageShell from '@/components/layout/PageShell'
import Badge from '@/components/ui/Badge'

interface ElevePresence {
  id: string
  nom: string
  prenom: string
  numero_matricule: string
  statut: string | null
  obs: string | null
}

interface Classe {
  id: string
  nom: string
  section: string
}

type Statut = 'present' | 'absent' | 'retard' | 'excuse'

export default function PresencesPage() {
  const { slug } = useParams()
  const [classes, setClasses] = useState<Classe[]>([])
  const [classeId, setClasseId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [eleves, setEleves] = useState<ElevePresence[]>([])
  const [presences, setPresences] = useState<Record<string, Statut>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/classes').then(r => r.json()).then(d => setClasses(d.classes || []))
  }, [])

  useEffect(() => {
    if (!classeId) return
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
      eleve_id, statut, note: null
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
    absent:  Object.values(presences).filter(s => s === 'absent').length,
    retard:  Object.values(presences).filter(s => s === 'retard').length,
    excuse:  Object.values(presences).filter(s => s === 'excuse').length,
  }

  const statutConfig: Record<Statut, { label: string; active: string; inactive: string }> = {
    present: { label: 'Présent',  active: 'bg-emerald-500 text-white', inactive: 'bg-slate-100 text-slate-500 hover:bg-emerald-50' },
    absent:  { label: 'Absent',   active: 'bg-red-500 text-white',     inactive: 'bg-slate-100 text-slate-500 hover:bg-red-50'     },
    retard:  { label: 'Retard',   active: 'bg-amber-500 text-white',   inactive: 'bg-slate-100 text-slate-500 hover:bg-amber-50'   },
    excuse:  { label: 'Excusé',   active: 'bg-blue-500 text-white',    inactive: 'bg-slate-100 text-slate-500 hover:bg-blue-50'    },
  }

  return (
    <PageShell
      title="Présences"
      subtitle="Registre d'appel quotidien par classe"
      breadcrumb="Présences"
    >
      <div className="card p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-500 mb-1">Classe</label>
          <select value={classeId} onChange={e => setClasseId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="">Sélectionner une classe</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>

        {eleves.length > 0 && (
          <>
            <button onClick={setTousPresents}
              className="border border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Tous présents
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé !' : 'Valider l\'appel'}
            </button>
          </>
        )}
      </div>

      {/* Stats rapides */}
      {eleves.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {Object.entries(stats).map(([key, val]) => (
            <div key={key} className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-slate-500 capitalize">{key === 'present' ? 'Présents' : key === 'absent' ? 'Absents' : key === 'retard' ? 'Retards' : 'Excusés'}</span>
              <span className="font-bold text-slate-800">{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Liste élèves */}
      {!classeId ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Sélectionnez une classe pour faire l'appel
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Chargement...
        </div>
      ) : eleves.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Aucun élève dans cette classe
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Élève</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {eleves.map((eleve, i) => (
                <tr key={eleve.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 text-sm">{eleve.nom} {eleve.prenom}</p>
                    <p className="text-xs text-slate-400">{eleve.numero_matricule}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(Object.keys(statutConfig) as Statut[]).map(s => (
                        <button key={s}
                          onClick={() => toggleStatut(eleve.id, s)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                            presences[eleve.id] === s
                              ? statutConfig[s].active
                              : statutConfig[s].inactive
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