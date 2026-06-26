'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import PhotoUpload from '@/components/eleves/PhotoUpload'
import PageShell from '@/components/layout/PageShell'

interface Classe {
  id: string
  nom: string
  section: string
  capacite_max: number
}

export default function NouvelElevePage() {
  const { slug } = useParams()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [classes, setClasses] = useState<Classe[]>([])
  const photoFileRef = useRef<File | null>(null)

  const [form, setForm] = useState({
    nom: '', prenom: '', date_naissance: '',
    lieu_naissance: '', sexe: '',
    classe_id: '', section: '',
    parent_nom: '', parent_prenom: '',
    parent_telephone: '', parent_lien: 'père',
  })

  const up = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  useEffect(() => {
    fetch('/api/classes').then(r => r.json()).then(d => setClasses(d.classes || []))
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    const res = await fetch('/api/eleves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Erreur lors de l\'inscription')
      setLoading(false)
      return
    }

    if (photoFileRef.current && data.id) {
      const formData = new FormData()
      formData.append('photo', photoFileRef.current)
      formData.append('eleve_id', data.id)
      await fetch('/api/upload', { method: 'POST', body: formData })
    }

    router.push(`/${slug}/eleves/${data.id}`)
  }

  const steps = [
    { num: 1, label: 'Identité' },
    { num: 2, label: 'Affectation' },
    { num: 3, label: 'Parent / Tuteur' },
  ]

  return (
    <PageShell title="Inscrire un élève" breadcrumb="Nouvel élève" subtitle="Formulaire d'inscription en 3 étapes">
      <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${step >= s.num ? 'text-emerald-600' : 'text-slate-400'}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold border-2 transition-colors ${
                step > s.num  ? 'bg-emerald-500 border-emerald-500 text-white' :
                step === s.num ? 'border-emerald-500 text-emerald-600' :
                'border-slate-300 text-slate-400'
              }`}>
                {step > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span className="text-base font-medium hidden sm:block">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 w-8 mx-1 ${step > s.num ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-6 text-base">
          {error}
        </div>
      )}

      <div className="card p-6">

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-semibold text-slate-800 text-lg mb-4">Informations personnelles</h2>

            <div className="flex justify-center mb-4">
              <PhotoUpload
                onSelected={(file) => { photoFileRef.current = file }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-base font-medium text-slate-700 mb-1">Nom *</label>
                <input value={form.nom} onChange={e => up('nom', e.target.value)}
                  placeholder="MBALLA"
                  className="input-field" />
              </div>
              <div>
                <label className="block text-base font-medium text-slate-700 mb-1">Prénom *</label>
                <input value={form.prenom} onChange={e => up('prenom', e.target.value)}
                  placeholder="Jean-Pierre"
                  className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-base font-medium text-slate-700 mb-1">Date de naissance</label>
                <input type="date" value={form.date_naissance} onChange={e => up('date_naissance', e.target.value)}
                  className="input-field" />
              </div>
              <div>
                <label className="block text-base font-medium text-slate-700 mb-1">Sexe *</label>
                <select value={form.sexe} onChange={e => up('sexe', e.target.value)}
                  className="input-field">
                  <option value="">Sélectionner</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-base font-medium text-slate-700 mb-1">Lieu de naissance</label>
              <input value={form.lieu_naissance} onChange={e => up('lieu_naissance', e.target.value)}
                placeholder="Douala, Cameroun"
                className="input-field" />
            </div>
            <button onClick={() => setStep(2)}
              disabled={!form.nom || !form.prenom || !form.sexe}
              className="w-full btn-primary flex items-center justify-center gap-2 mt-2">
              Suivant <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-semibold text-slate-800 text-lg mb-4">Affectation scolaire</h2>
            <div>
              <label className="block text-base font-medium text-slate-700 mb-1">Section *</label>
              <select value={form.section} onChange={e => up('section', e.target.value)}
                className="input-field">
                <option value="">Sélectionner la section</option>
                <option value="francophone">Francophone (SIL - CM2)</option>
                <option value="anglophone">Anglophone (Class 1 - Class 6)</option>
                <option value="maternelle">Maternelle</option>
              </select>
            </div>
            <div>
              <label className="block text-base font-medium text-slate-700 mb-1">Classe *</label>
              <select value={form.classe_id} onChange={e => up('classe_id', e.target.value)}
                className="input-field">
                <option value="">Sélectionner la classe</option>
                {classes
                  .filter(c => !form.section || c.section === form.section)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
              </select>
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setStep(1)}
                className="flex-1 flex items-center justify-center gap-2 border border-slate-200 text-slate-600 font-semibold rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors text-base">
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>
              <button onClick={() => setStep(3)}
                disabled={!form.section || !form.classe_id}
                className="flex-1 btn-primary flex items-center justify-center gap-2">
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-semibold text-slate-800 text-lg mb-4">Parent / Tuteur légal</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-base font-medium text-slate-700 mb-1">Nom *</label>
                <input value={form.parent_nom} onChange={e => up('parent_nom', e.target.value)}
                  placeholder="MBALLA"
                  className="input-field" />
              </div>
              <div>
                <label className="block text-base font-medium text-slate-700 mb-1">Prénom</label>
                <input value={form.parent_prenom} onChange={e => up('parent_prenom', e.target.value)}
                  placeholder="Paul"
                  className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-base font-medium text-slate-700 mb-1">Téléphone *</label>
                <input type="tel" value={form.parent_telephone} onChange={e => up('parent_telephone', e.target.value)}
                  placeholder="699 000 000"
                  className="input-field" />
              </div>
              <div>
                <label className="block text-base font-medium text-slate-700 mb-1">Lien</label>
                <select value={form.parent_lien} onChange={e => up('parent_lien', e.target.value)}
                  className="input-field">
                  <option value="père">Père</option>
                  <option value="mère">Mère</option>
                  <option value="tuteur">Tuteur</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setStep(2)}
                className="flex-1 flex items-center justify-center gap-2 border border-slate-200 text-slate-600 font-semibold rounded-lg px-4 py-3 hover:bg-slate-50 transition-colors text-base">
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>
              <button onClick={handleSubmit}
                disabled={loading || !form.parent_nom || !form.parent_telephone}
                className="flex-1 btn-primary flex items-center justify-center gap-2">
                {loading ? 'Enregistrement...' : <><Check className="w-4 h-4" /> Inscrire l&apos;élève</>}
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </PageShell>
  )
}
