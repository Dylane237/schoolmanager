'use client'

import { useState, useEffect } from 'react'
import { Plus, Megaphone, Trash2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import PageShell from '@/components/layout/PageShell'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'

interface Annonce {
  id: string
  titre: string
  contenu: string
  cible: string
  priorite: string
  auteur_nom: string
  date_publication: string
  date_expiration: string | null
  is_active: number
}

const CIBLE_LABELS: Record<string, string> = {
  tous: 'Tous',
  personnel: 'Personnel',
  parents: 'Parents',
  enseignants: 'Enseignants',
}

const PRIORITE_VARIANT: Record<string, 'default' | 'warning' | 'danger'> = {
  normale: 'default',
  importante: 'warning',
  urgente: 'danger',
}

export default function AnnoncesPage() {
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titre: '', contenu: '', cible: 'tous', priorite: 'normale', date_expiration: '',
  })

  const fetchAnnonces = async () => {
    setLoading(true)
    const res = await fetch('/api/annonces')
    const data = await res.json()
    setAnnonces(data.annonces || [])
    setLoading(false)
  }

  useEffect(() => { fetchAnnonces() }, [])

  const handleCreate = async () => {
    if (!form.titre.trim() || !form.contenu.trim()) {
      toast.error('Titre et contenu requis')
      return
    }
    setSaving(true)
    const res = await fetch('/api/annonces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      toast.error('Erreur lors de la publication')
      setSaving(false)
      return
    }
    toast.success('Annonce publiée')
    setShowForm(false)
    setForm({ titre: '', contenu: '', cible: 'tous', priorite: 'normale', date_expiration: '' })
    await fetchAnnonces()
    setSaving(false)
  }

  const toggleActive = async (id: string, is_active: number) => {
    await fetch('/api/annonces', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !is_active }),
    })
    await fetchAnnonces()
    toast.success(is_active ? 'Annonce masquée' : 'Annonce réactivée')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return
    await fetch(`/api/annonces?id=${id}`, { method: 'DELETE' })
    await fetchAnnonces()
    toast.success('Annonce supprimée')
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <PageShell
      title="Annonces"
      subtitle="Communications officielles de l'établissement"
      breadcrumb="Annonces"
      actions={
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 py-2.5">
          <Plus className="w-5 h-5" /> Nouvelle annonce
        </button>
      }
    >
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Publier une annonce" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Titre *</label>
            <input value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))}
              placeholder="Réunion des parents, fermeture exceptionnelle..."
              className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Contenu *</label>
            <textarea value={form.contenu} onChange={e => setForm(p => ({ ...p, contenu: e.target.value }))}
              rows={5} placeholder="Détails de l'annonce..."
              className="input-field resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Destinataires</label>
              <select value={form.cible} onChange={e => setForm(p => ({ ...p, cible: e.target.value }))} className="input-field">
                <option value="tous">Tous</option>
                <option value="personnel">Personnel</option>
                <option value="parents">Parents</option>
                <option value="enseignants">Enseignants</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Priorité</label>
              <select value={form.priorite} onChange={e => setForm(p => ({ ...p, priorite: e.target.value }))} className="input-field">
                <option value="normale">Normale</option>
                <option value="importante">Importante</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Date d&apos;expiration (optionnel)</label>
            <input type="date" value={form.date_expiration}
              onChange={e => setForm(p => ({ ...p, date_expiration: e.target.value }))}
              className="input-field" />
          </div>
          <button onClick={handleCreate} disabled={saving} className="w-full btn-primary">
            {saving ? 'Publication...' : 'Publier l\'annonce'}
          </button>
        </div>
      </Modal>

      {loading ? (
        <div className="card p-16 text-center text-slate-400">Chargement...</div>
      ) : annonces.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Aucune annonce"
          description="Publiez votre première communication officielle à destination du personnel et des parents."
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary">
              Créer une annonce
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {annonces.map(a => (
            <article key={a.id}
              className={`card p-6 transition-all ${!a.is_active ? 'opacity-60' : ''} ${
                a.priorite === 'urgente' ? 'border-red-200' : a.priorite === 'importante' ? 'border-amber-200' : ''
              }`}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant={PRIORITE_VARIANT[a.priorite] ?? 'default'}>
                      {a.priorite.charAt(0).toUpperCase() + a.priorite.slice(1)}
                    </Badge>
                    <Badge variant="info">{CIBLE_LABELS[a.cible] || a.cible}</Badge>
                    {!a.is_active && <Badge variant="neutral">Masquée</Badge>}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{a.titre}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {formatDate(a.date_publication)} · {a.auteur_nom || 'Administration'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(a.id, a.is_active)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title={a.is_active ? 'Masquer' : 'Réactiver'}>
                    {a.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(a.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap">{a.contenu}</p>
              {a.date_expiration && (
                <p className="text-sm text-slate-400 mt-3">Expire le {formatDate(a.date_expiration)}</p>
              )}
            </article>
          ))}
        </div>
      )}
    </PageShell>
  )
}
