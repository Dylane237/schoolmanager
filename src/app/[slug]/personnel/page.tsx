'use client'

import { Suspense, useState, useEffect, useMemo, useCallback } from 'react'
import { Plus, Trash2, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import PageShell from '@/components/layout/PageShell'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import SmartFilterBar from '@/components/filters/SmartFilterBar'
import { useSmartFilters } from '@/hooks/useSmartFilters'

interface Staff {
  id: string
  nom: string
  prenom: string
  telephone: string
  email: string
  type: string
  contrat: string
  date_embauche: string
  salaire: number
}

const TYPES = [
  { value: 'enseignant',           label: 'Enseignant'           },
  { value: 'administratif',        label: 'Administratif'        },
  { value: 'assistant_maternelle', label: 'Assistant maternelle' },
  { value: 'securite',             label: 'Sécurité'             },
  { value: 'entretien',            label: 'Entretien'            },
  { value: 'chauffeur',            label: 'Chauffeur'            },
]

const CONTRATS = [
  { value: 'cdi',       label: 'CDI'       },
  { value: 'cdd',       label: 'CDD'       },
  { value: 'vacataire', label: 'Vacataire' },
  { value: 'benevole',  label: 'Bénévole'  },
]

export default function PersonnelPage() {
  return (
    <Suspense fallback={<PageShell title="Personnel" breadcrumb="Personnel"><div className="card p-12 text-center text-slate-400">Chargement...</div></PageShell>}>
      <PersonnelPageContent />
    </Suspense>
  )
}

function PersonnelPageContent() {
  const [personnel, setPersonnel] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const filterFields = useMemo(() => [
    { key: 'q', type: 'search' as const, placeholder: 'Rechercher nom, téléphone, email...', debounce: true },
    {
      key: 'type',
      type: 'pills' as const,
      label: 'Type',
      options: [{ value: '', label: 'Tous' }, ...TYPES.map(t => ({ value: t.value, label: t.label }))],
      defaultValue: '',
    },
    {
      key: 'contrat',
      type: 'select' as const,
      label: 'Contrat',
      options: [{ value: '', label: 'Tous les contrats' }, ...CONTRATS.map(c => ({ value: c.value, label: c.label }))],
      defaultValue: '',
    },
  ], [])

  const { values, debouncedValues, setFilter, reset, activeFilters } = useSmartFilters(filterFields)

  const [form, setForm] = useState({
    nom: '', prenom: '', telephone: '', email: '',
    type: 'enseignant', contrat: 'cdi',
    date_embauche: '', salaire: '',
  })

  const up = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  const fetchPersonnel = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedValues.q) params.set('search', debouncedValues.q)
    if (debouncedValues.type) params.set('type', debouncedValues.type)
    if (debouncedValues.contrat) params.set('contrat', debouncedValues.contrat)
    const res = await fetch(`/api/personnel?${params}`)
    const data = await res.json()
    setPersonnel(data.personnel || [])
    setLoading(false)
  }, [debouncedValues])

  useEffect(() => { fetchPersonnel() }, [fetchPersonnel])

  const handleCreate = async () => {
    if (!form.nom || !form.type) return
    setSaving(true)
    await fetch('/api/personnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    toast.success('Membre ajouté')
    setShowForm(false)
    setForm({ nom: '', prenom: '', telephone: '', email: '', type: 'enseignant', contrat: 'cdi', date_embauche: '', salaire: '' })
    await fetchPersonnel()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce membre du personnel ?')) return
    await fetch(`/api/personnel?id=${id}`, { method: 'DELETE' })
    await fetchPersonnel()
    toast.success('Membre supprimé')
  }

  const typeLabel = (type: string) => TYPES.find(t => t.value === type)?.label || type
  const contratLabel = (contrat: string) => CONTRATS.find(c => c.value === contrat)?.label || contrat

  const typeColor = (type: string) => {
    const map: Record<string, string> = {
      enseignant: 'bg-blue-100 text-blue-700',
      administratif: 'bg-purple-100 text-purple-700',
      assistant_maternelle: 'bg-pink-100 text-pink-700',
      securite: 'bg-red-100 text-red-700',
      entretien: 'bg-amber-100 text-amber-700',
      chauffeur: 'bg-slate-100 text-slate-700',
    }
    return map[type] || 'bg-slate-100 text-slate-700'
  }

  return (
    <PageShell
      title="Personnel"
      subtitle={`${personnel.length} membre(s) du staff`}
      breadcrumb="Personnel"
      actions={
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 py-2.5">
          <Plus className="w-5 h-5" /> Ajouter
        </button>
      }
    >
      <SmartFilterBar
        fields={filterFields}
        values={values}
        onChange={setFilter}
        onReset={reset}
        activeFilters={activeFilters}
        resultCount={personnel.length}
        resultLabel="membre(s)"
        loading={loading}
        className="mb-6"
      />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouveau membre" size="lg">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                  <input value={form.nom} onChange={e => up('nom', e.target.value)}
                    placeholder="MBALLA"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
                  <input value={form.prenom} onChange={e => up('prenom', e.target.value)}
                    placeholder="Jean"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                  <input value={form.telephone} onChange={e => up('telephone', e.target.value)}
                    placeholder="699 000 000"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input value={form.email} onChange={e => up('email', e.target.value)}
                    placeholder="jean@ecole.cm"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                  <select value={form.type} onChange={e => up('type', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contrat</label>
                  <select value={form.contrat} onChange={e => up('contrat', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    {CONTRATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date d'embauche</label>
                  <input type="date" value={form.date_embauche} onChange={e => up('date_embauche', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Salaire (FCFA)</label>
                  <input type="number" value={form.salaire} onChange={e => up('salaire', e.target.value)}
                    placeholder="150000"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>

              <button onClick={handleCreate} disabled={saving || !form.nom} className="w-full btn-primary">
                {saving ? 'Enregistrement...' : 'Ajouter au personnel'}
              </button>
            </div>
      </Modal>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : personnel.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-sm mb-4">Aucun membre du personnel</p>
            <button onClick={() => setShowForm(true)}
              className="text-emerald-500 hover:text-emerald-600 text-sm font-medium">
              Ajouter le premier membre
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Nom complet', 'Type', 'Contrat', 'Contact', 'Salaire', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {personnel.map((s, i) => (
                <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800 text-sm">{s.nom} {s.prenom}</p>
                    <p className="text-xs text-slate-400">{s.date_embauche || '—'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${typeColor(s.type)}`}>
                      {typeLabel(s.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{contratLabel(s.contrat)}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-600">{s.telephone || '—'}</p>
                    <p className="text-xs text-slate-400">{s.email || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {s.salaire ? `${Number(s.salaire).toLocaleString('fr-FR')} FCFA` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(s.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  )
}