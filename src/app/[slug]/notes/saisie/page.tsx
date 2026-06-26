'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Save, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PageShell from '@/components/layout/PageShell'
import { getNoteMax, getMention } from '@/lib/notes-utils'

interface Classe { id: string; nom: string; section: string }
interface Matiere { id: string; nom: string; coefficient: number }
interface Eleve { id: string; nom: string; prenom: string; numero_matricule: string }
interface Note { eleve_id: string; note: number; appreciation: string }

export default function SaisieNotesPage() {
  const { slug } = useParams()
  const [classes, setClasses] = useState<Classe[]>([])
  const [matieres, setMatieres] = useState<Matiere[]>([])
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [classeId, setClasseId] = useState('')
  const [matiereId, setMatiereId] = useState('')
  const [periode, setPeriode] = useState('T1')
  const [section, setSection] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showMatForm, setShowMatForm] = useState(false)
  const [newMat, setNewMat] = useState({ nom: '', coefficient: '1' })

  useEffect(() => {
    fetch('/api/classes').then(r => r.json()).then(d => setClasses(d.classes || []))
  }, [])

  useEffect(() => {
    if (!classeId) return
    const classe = classes.find(c => c.id === classeId)
    setSection(classe?.section || '')
    fetch(`/api/notes?classe_id=${classeId}`)
      .then(r => r.json())
      .then(d => {
        setMatieres(d.matieres || [])
        setEleves(d.eleves || [])
        if (d.section) setSection(d.section)
      })
    setMatiereId('')
    setNotes({})
  }, [classeId])

  useEffect(() => {
    if (!classeId || !matiereId || !periode) return
    fetch(`/api/notes?classe_id=${classeId}&matiere_id=${matiereId}&periode=${periode}`)
      .then(r => r.json())
      .then(d => {
        const map: Record<string, string> = {}
        d.notes?.forEach((n: Note) => { map[n.eleve_id] = String(n.note) })
        setNotes(map)
      })
  }, [matiereId, periode])

  const periodes = section === 'anglophone'
    ? ['S1','S2','S3','S4','S5','S6']
    : ['T1','T2','T3']

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
    toast.success('Notes sauvegardées')
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

  const getMoyenne = (eleveId: string) => {
    const note = parseFloat(notes[eleveId] || '')
    return isNaN(note) ? '—' : note.toFixed(2)
  }

  const getMentionLabel = (note: number) => getMention(note, section)

  return (
    <PageShell
      title="Saisie des notes"
      subtitle={section === 'anglophone' ? 'Notation sur 100 (grades A-F)' : 'Notation sur 20'}
      breadcrumb="Notes"
    >
      <div className="card p-4 mb-6 flex flex-wrap gap-4">
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-500 mb-1">Classe</label>
          <select value={classeId} onChange={e => setClasseId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="">Sélectionner</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-500 mb-1">Matière</label>
          <select value={matiereId} onChange={e => setMatiereId(e.target.value)}
            disabled={!classeId}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-slate-50">
            <option value="">Sélectionner</option>
            {matieres.map(m => (
              <option key={m.id} value={m.id}>{m.nom} (coeff. {m.coefficient})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Période</label>
          <select value={periode} onChange={e => setPeriode(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            {periodes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {classeId && (
          <div className="flex items-end">
            <button onClick={() => setShowMatForm(true)}
              className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Matière
            </button>
          </div>
        )}

        {matiereId && (
          <div className="flex items-end">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : saved ? 'Sauvegardé !' : 'Sauvegarder'}
            </button>
          </div>
        )}
      </div>

      {/* Modal nouvelle matière */}
      {showMatForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">Nouvelle matière</h3>
              <button onClick={() => setShowMatForm(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <input value={newMat.nom} onChange={e => setNewMat(p => ({ ...p, nom: e.target.value }))}
                placeholder="Nom de la matière"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              <input type="number" value={newMat.coefficient}
                onChange={e => setNewMat(p => ({ ...p, coefficient: e.target.value }))}
                placeholder="Coefficient"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              <button onClick={handleAddMatiere}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg px-4 py-2.5 text-sm transition-colors">
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grille de saisie */}
      {!classeId ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Sélectionnez une classe pour commencer la saisie
        </div>
      ) : !matiereId ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          Sélectionnez une matière
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
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-500 uppercase tracking-wide w-32">
                  Note /{noteMax || 20}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {eleves.map((eleve, i) => {
                const noteVal = parseFloat(notes[eleve.id] || '')
                const mention = !isNaN(noteVal) ? getMentionLabel(noteVal) : null
                return (
                  <tr key={eleve.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 text-sm">{eleve.nom} {eleve.prenom}</p>
                      <p className="text-xs text-slate-400">{eleve.numero_matricule}</p>
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
                      {mention && (
                        <span className={`text-xs font-semibold ${mention.color}`}>
                          {mention.label}
                        </span>
                      )}
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