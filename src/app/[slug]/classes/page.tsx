'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Plus, School, UserCheck, ChevronRight, BookOpen, Layers, ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import PageShell from '@/components/layout/PageShell'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import EmptyState from '@/components/ui/EmptyState'
import { useSchool } from '@/components/layout/SchoolProvider'
import {
  CAMEROON_SECTIONS,
  SECTION_ORDER,
  sectionLabel,
  type SectionRef,
} from '@/lib/cameroon-levels'

interface Classe {
  id: string
  nom: string
  section: string
  niveau: string
  annee_scolaire: string
  capacite_max: number
  nb_eleves: number
  personnel_id: string | null
  enseignant_nom: string | null
  enseignant_prenom: string | null
}

interface Enseignant {
  id: string
  nom: string
  prenom: string | null
}

export default function ClassesPage() {
  const { slug } = useParams()
  const { anneeScolaire } = useSchool()
  const [classes, setClasses] = useState<Classe[]>([])
  const [enseignants, setEnseignants] = useState<Enseignant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showReferentiel, setShowReferentiel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedNiveaux, setSelectedNiveaux] = useState<Set<string>>(new Set())
  const [activeSection, setActiveSection] = useState<string>('francophone')

  const [form, setForm] = useState({
    nom: '', section: 'francophone', niveau: '',
    annee_scolaire: anneeScolaire, capacite_max: '60',
  })

  const up = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  const fetchClasses = async () => {
    setLoading(true)
    const [cRes, pRes] = await Promise.all([
      fetch('/api/classes'),
      fetch('/api/personnel?type=enseignant'),
    ])
    const cData = await cRes.json()
    const pData = await pRes.json()
    setClasses(cData.classes || [])
    setEnseignants(pData.personnel || [])
    setLoading(false)
  }

  useEffect(() => { fetchClasses() }, [])

  const handleCreate = async () => {
    if (!form.nom || !form.section) return
    setSaving(true)
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      toast.error('Erreur lors de la création')
      setSaving(false)
      return
    }
    toast.success('Classe créée avec succès')
    setShowForm(false)
    setForm({ nom: '', section: 'francophone', niveau: '', annee_scolaire: anneeScolaire, capacite_max: '60' })
    await fetchClasses()
    setSaving(false)
  }

  const handleBulkCreate = async () => {
    if (selectedNiveaux.size === 0) return
    setSaving(true)
    const toCreate: { nom: string; section: string; niveau: string; code: string }[] = []

    for (const key of selectedNiveaux) {
      const [section, code] = key.split('::')
      const sec = CAMEROON_SECTIONS.find(s => s.id === section)
      if (!sec) continue
      for (const cycle of sec.cycles) {
        const nv = cycle.niveaux.find(n => n.code === code)
        if (nv) {
          toCreate.push({ nom: nv.nomDefaut, section, niveau: nv.code, code: nv.code })
        }
      }
    }

    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classes: toCreate, annee_scolaire: anneeScolaire }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error('Erreur lors de la création')
      setSaving(false)
      return
    }
    toast.success(`${data.created} classe(s) créée(s)`)
    setShowReferentiel(false)
    setSelectedNiveaux(new Set())
    await fetchClasses()
    setSaving(false)
  }

  const toggleNiveau = (section: string, code: string) => {
    const key = `${section}::${code}`
    setSelectedNiveaux(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const isNiveauCreated = (section: string, nomDefaut: string) =>
    classes.some(c => c.section === section && (c.nom === nomDefaut || c.niveau === nomDefaut))

  const handleAssignEnseignant = async (classeId: string, personnelId: string) => {
    const res = await fetch('/api/classes', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: classeId, personnel_id: personnelId || null }),
    })
    if (!res.ok) {
      toast.error('Erreur lors de l\'affectation')
      return
    }
    toast.success('Enseignant affecté')
    await fetchClasses()
  }

  const sectionVariant = (section: string): 'info' | 'neutral' | 'default' => {
    if (section === 'francophone') return 'info'
    if (section === 'anglophone') return 'neutral'
    return 'default'
  }

  const grouped = SECTION_ORDER.reduce((acc: Record<string, Classe[]>, section) => {
    const items = classes.filter(c => c.section === section)
    if (items.length > 0) acc[section] = items
    return acc
  }, {})

  const activeRef = CAMEROON_SECTIONS.find(s => s.id === activeSection)

  return (
    <PageShell
      title="Classes"
      subtitle={`${classes.length} classe(s) · Année ${anneeScolaire}`}
      breadcrumb="Classes"
      actions={
        <div className="flex items-center gap-2">
          <Link href={`/${slug}/classes/transferts`} className="btn-secondary flex items-center gap-2 py-2.5">
            <ArrowRightLeft className="w-5 h-5" /> Répartition
          </Link>
          <button onClick={() => setShowReferentiel(true)} className="btn-secondary flex items-center gap-2 py-2.5">
            <Layers className="w-5 h-5" /> Référentiel CM
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 py-2.5">
            <Plus className="w-5 h-5" /> Nouvelle classe
          </button>
        </div>
      }
    >
      {/* Référentiel camerounais — aperçu */}
      <div className="card p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          <h2 className="font-semibold text-slate-800">Référentiel des niveaux — Cameroun</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {CAMEROON_SECTIONS.map(sec => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeSection === sec.id
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
        {activeRef && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">{activeRef.description}</p>
            {activeRef.cycles.map(cycle => (
              <div key={cycle.nom}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{cycle.nom}</p>
                <div className="flex flex-wrap gap-2">
                  {cycle.niveaux.map(nv => {
                    const created = isNiveauCreated(activeRef.id, nv.nomDefaut)
                    return (
                      <span
                        key={nv.code}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                          created
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                        title={nv.label}
                      >
                        {nv.nomDefaut}
                        {created && ' ✓'}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={showReferentiel} onClose={() => setShowReferentiel(false)} title="Créer depuis le référentiel">
        <p className="text-sm text-slate-500 mb-4">
          Sélectionnez les niveaux à créer pour l&apos;année {anneeScolaire}. Les classes existantes sont ignorées.
        </p>
        <div className="max-h-80 overflow-y-auto space-y-4 mb-4">
          {CAMEROON_SECTIONS.map((sec: SectionRef) => (
            <div key={sec.id}>
              <p className="font-semibold text-slate-700 mb-2">{sec.label}</p>
              {sec.cycles.map(cycle => (
                <div key={cycle.nom} className="mb-3 pl-2">
                  <p className="text-xs text-slate-400 mb-1.5">{cycle.nom}</p>
                  <div className="space-y-1">
                    {cycle.niveaux.map(nv => {
                      const key = `${sec.id}::${nv.code}`
                      const created = isNiveauCreated(sec.id, nv.nomDefaut)
                      return (
                        <label key={nv.code} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${created ? 'opacity-50' : 'hover:bg-slate-50'}`}>
                          <input
                            type="checkbox"
                            disabled={created}
                            checked={selectedNiveaux.has(key)}
                            onChange={() => toggleNiveau(sec.id, nv.code)}
                            className="rounded border-slate-300"
                          />
                          <span className="text-sm text-slate-700">{nv.nomDefaut}</span>
                          <span className="text-xs text-slate-400">{nv.label}</span>
                          {created && <Badge variant="success" size="sm">Existe</Badge>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <button
          onClick={handleBulkCreate}
          disabled={saving || selectedNiveaux.size === 0}
          className="w-full btn-primary"
        >
          {saving ? 'Création...' : `Créer ${selectedNiveaux.size} classe(s)`}
        </button>
      </Modal>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle classe">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Section *</label>
            <select value={form.section} onChange={e => { up('section', e.target.value); up('niveau', '') }} className="input-field">
              <option value="francophone">Francophone</option>
              <option value="anglophone">Anglophone</option>
              <option value="maternelle">Maternelle</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Niveau (référentiel)</label>
            <select value={form.niveau} onChange={e => {
              const sec = CAMEROON_SECTIONS.find(s => s.id === form.section)
              const nv = sec?.cycles.flatMap(c => c.niveaux).find(n => n.code === e.target.value)
              up('niveau', e.target.value)
              if (nv) up('nom', nv.nomDefaut)
            }} className="input-field">
              <option value="">— Choisir un niveau —</option>
              {CAMEROON_SECTIONS.find(s => s.id === form.section)?.cycles.flatMap(c =>
                c.niveaux.map(nv => (
                  <option key={nv.code} value={nv.code}>{nv.nomDefaut} — {nv.label}</option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nom de la classe *</label>
            <input value={form.nom} onChange={e => up('nom', e.target.value)}
              placeholder="CM2 A, Class 3 B..."
              className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Année scolaire</label>
              <input value={form.annee_scolaire} onChange={e => up('annee_scolaire', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Capacité max</label>
              <input type="number" value={form.capacite_max} onChange={e => up('capacite_max', e.target.value)} className="input-field" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving || !form.nom} className="w-full btn-primary">
            {saving ? 'Création...' : 'Créer la classe'}
          </button>
        </div>
      </Modal>

      {loading ? (
        <div className="card p-16 text-center text-slate-400">Chargement...</div>
      ) : classes.length === 0 ? (
        <EmptyState
          icon={School}
          title="Aucune classe configurée"
          description="Utilisez le référentiel camerounais pour créer vos classes en un clic."
          action={
            <button onClick={() => setShowReferentiel(true)} className="btn-primary">
              Ouvrir le référentiel
            </button>
          }
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section}>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {sectionLabel(section)}
                <span className="text-slate-400 font-normal normal-case">({items.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(c => {
                  const taux = c.capacite_max > 0 ? Math.round((c.nb_eleves / c.capacite_max) * 100) : 0
                  const plein = c.nb_eleves >= c.capacite_max
                  return (
                    <Link
                      key={c.id}
                      href={`/${slug}/classes/${c.id}`}
                      className="card p-5 hover:shadow-md hover:border-emerald-300 border border-transparent transition-all group block"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-slate-800 text-lg group-hover:text-emerald-600 transition-colors">{c.nom}</h3>
                          {c.niveau && c.niveau !== c.nom && (
                            <p className="text-xs text-slate-400 mt-0.5">{c.niveau}</p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                      </div>
                      <p className="text-sm text-slate-400 mb-4">{c.annee_scolaire}</p>
                      <div className="mb-3">
                        <div className="flex justify-between text-sm text-slate-600 mb-1.5">
                          <span className="font-medium">{c.nb_eleves} élève(s)</span>
                          <span>{c.capacite_max} places</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${plein ? 'bg-red-500' : taux > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(taux, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="pt-3 border-t border-slate-100" onClick={e => e.preventDefault()}>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
                          <UserCheck className="w-3.5 h-3.5" /> Titulaire
                        </label>
                        <select
                          value={c.personnel_id || ''}
                          onClick={e => e.stopPropagation()}
                          onChange={e => { e.stopPropagation(); handleAssignEnseignant(c.id, e.target.value) }}
                          className="input-field text-sm py-2"
                        >
                          <option value="">
                            {c.enseignant_nom ? `${c.enseignant_nom}${c.enseignant_prenom ? ` ${c.enseignant_prenom}` : ''}` : 'Non assigné'}
                          </option>
                          {enseignants.filter(en => en.id !== c.personnel_id).map(en => (
                            <option key={en.id} value={en.id}>
                              {en.nom}{en.prenom ? ` ${en.prenom}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        {plein ? (
                          <Badge variant="danger">Classe pleine</Badge>
                        ) : taux > 80 ? (
                          <Badge variant="warning">Presque pleine</Badge>
                        ) : (
                          <span className="text-sm text-slate-400">{100 - taux}% disponible</span>
                        )}
                        <span className="text-xs text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          Voir détails →
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
