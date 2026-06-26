'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Check, Save, Database, Calendar, Shield, Coins, FolderOpen } from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import UsersManagement from '@/components/parametres/UsersManagement'
import { useSchool } from '@/components/layout/SchoolProvider'

interface Ecole {
  id: string
  nom: string
  slug: string
  telephone: string
  adresse: string
  email: string
  directeur_nom: string
}

interface AnneeScolaire {
  id: string
  label: string
  is_active: number
}

interface Backup {
  name: string
  date: string
  size: number
}

interface ClasseOption {
  id: string
  nom: string
  section: string
}

interface TrancheRow {
  tranche_numero: number
  montant_attendu: number
  date_limite: string
}

export default function ParametresPage() {
  const { slug } = useParams()
  const { userRole } = useSchool()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [annees, setAnnees] = useState<AnneeScolaire[]>([])
  const [backups, setBackups] = useState<Backup[]>([])
  const [classes, setClasses] = useState<ClasseOption[]>([])
  const [trancheClasseId, setTrancheClasseId] = useState('')
  const [tranches, setTranches] = useState<TrancheRow[]>([
    { tranche_numero: 1, montant_attendu: 0, date_limite: '' },
    { tranche_numero: 2, montant_attendu: 0, date_limite: '' },
    { tranche_numero: 3, montant_attendu: 0, date_limite: '' },
  ])
  const [savingTranches, setSavingTranches] = useState(false)
  const [newAnnee, setNewAnnee] = useState('')
  const [dataPath, setDataPath] = useState('Documents/SchoolManager')
  const [form, setForm] = useState({
    nom: '', telephone: '', adresse: '',
    email: '', directeur_nom: '',
  })

  const up = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.getDataPath) {
      window.electronAPI.getDataPath().then(setDataPath)
    }
  }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/ecole').then(r => r.json()),
      fetch('/api/annees-scolaires').then(r => r.json()),
      fetch('/api/backup').then(r => r.json()),
      fetch('/api/tranches-config').then(r => r.json()),
    ]).then(([ecoleData, anneeData, backupData, trancheData]) => {
      if (ecoleData.ecole) {
        setForm({
          nom: ecoleData.ecole.nom || '',
          telephone: ecoleData.ecole.telephone || '',
          adresse: ecoleData.ecole.adresse || '',
          email: ecoleData.ecole.email || '',
          directeur_nom: ecoleData.ecole.directeur_nom || '',
        })
      }
      setAnnees(anneeData.annees || [])
      setBackups(backupData.backups || [])
      setClasses(trancheData.classes || [])
      setLoading(false)
    })
  }, [])

  const loadTranchesForClasse = async (classeId: string) => {
    setTrancheClasseId(classeId)
    if (!classeId) return
    const res = await fetch(`/api/tranches-config?classe_id=${classeId}`)
    const data = await res.json()
    const existing = data.tranches as TrancheRow[]
    if (existing.length > 0) {
      setTranches(existing.map(t => ({
        tranche_numero: t.tranche_numero,
        montant_attendu: t.montant_attendu,
        date_limite: t.date_limite || '',
      })))
    } else {
      setTranches([
        { tranche_numero: 1, montant_attendu: 0, date_limite: '' },
        { tranche_numero: 2, montant_attendu: 0, date_limite: '' },
        { tranche_numero: 3, montant_attendu: 0, date_limite: '' },
      ])
    }
  }

  const handleSaveTranches = async () => {
    if (!trancheClasseId) return
    setSavingTranches(true)
    await fetch('/api/tranches-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classe_id: trancheClasseId, tranches }),
    })
    setSavingTranches(false)
    showSuccess('Tranches enregistrées')
  }

  const updateTranche = (idx: number, field: keyof TrancheRow, value: string) => {
    setTranches(prev => prev.map((t, i) =>
      i === idx ? { ...t, [field]: field === 'montant_attendu' ? Number(value) : value } : t
    ))
  }

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/ecole', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    showSuccess('Paramètres sauvegardés')
  }

  const handleBackup = async (action: 'manual' | 'export') => {
    const res = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()
    if (data.success) {
      showSuccess(action === 'manual' ? 'Sauvegarde créée' : 'Export réalisé')
      const backupRes = await fetch('/api/backup')
      const backupData = await backupRes.json()
      setBackups(backupData.backups || [])
    }
  }

  const handleAddAnnee = async () => {
    if (!newAnnee) return
    await fetch('/api/annees-scolaires', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newAnnee, is_active: annees.length === 0 }),
    })
    const res = await fetch('/api/annees-scolaires')
    const data = await res.json()
    setAnnees(data.annees || [])
    setNewAnnee('')
    showSuccess('Année scolaire ajoutée')
  }

  const handleActivateAnnee = async (id: string) => {
    await fetch('/api/annees-scolaires', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: true }),
    })
    const res = await fetch('/api/annees-scolaires')
    const data = await res.json()
    setAnnees(data.annees || [])
    showSuccess('Année scolaire activée')
  }

  if (loading) return (
    <div className="p-8 text-center text-slate-400 text-base">Chargement...</div>
  )

  return (
    <PageShell
      title="Paramètres"
      subtitle="Configuration de l'établissement"
      breadcrumb="Paramètres"
    >
      <div className="max-w-3xl space-y-8">      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-3 text-base flex items-center gap-2">
          <Check className="w-5 h-5" /> {success}
        </div>
      )}

      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-slate-800 text-lg border-b border-slate-100 pb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-500" />
          Informations de l&apos;école
        </h2>

        <div>
          <label className="block text-base font-medium text-slate-700 mb-1">Nom de l&apos;établissement</label>
          <input value={form.nom} onChange={e => up('nom', e.target.value)} className="input-field" />
        </div>

        <div>
          <label className="block text-base font-medium text-slate-700 mb-1">Nom du directeur</label>
          <input value={form.directeur_nom} onChange={e => up('directeur_nom', e.target.value)} className="input-field" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-base font-medium text-slate-700 mb-1">Téléphone</label>
            <input value={form.telephone} onChange={e => up('telephone', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-base font-medium text-slate-700 mb-1">Email</label>
            <input value={form.email} onChange={e => up('email', e.target.value)} className="input-field" />
          </div>
        </div>

        <div>
          <label className="block text-base font-medium text-slate-700 mb-1">Adresse</label>
          <textarea value={form.adresse} onChange={e => up('adresse', e.target.value)}
            rows={2} className="input-field resize-none" />
        </div>

        <div>
          <label className="block text-base font-medium text-slate-700 mb-1">Identifiant URL</label>
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
            <span className="px-3 py-2.5 text-base text-slate-400 border-r border-slate-200">
              schoolmanager/
            </span>
            <span className="px-3 py-2.5 text-base text-slate-600 font-mono">{slug}</span>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-5 h-5" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>

      {(userRole === 'admin' || userRole === 'super_admin') && (
        <UsersManagement />
      )}

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-lg border-b border-slate-100 pb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-500" />
          Années scolaires
        </h2>

        <div className="flex gap-3">
          <input
            value={newAnnee}
            onChange={e => setNewAnnee(e.target.value)}
            placeholder="2025-2026"
            className="input-field flex-1"
          />
          <button onClick={handleAddAnnee} className="btn-primary px-6">Ajouter</button>
        </div>

        {annees.length === 0 ? (
          <p className="text-slate-400 text-base">Aucune année scolaire configurée</p>
        ) : (
          <div className="space-y-2">
            {annees.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                <span className="font-medium text-base">{a.label}</span>
                {a.is_active ? (
                  <span className="text-sm font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">Active</span>
                ) : (
                  <button onClick={() => handleActivateAnnee(a.id)}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                    Activer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-lg border-b border-slate-100 pb-3 flex items-center gap-2">
          <Coins className="w-5 h-5 text-emerald-500" />
          Tranches de frais scolaires
        </h2>

        <p className="text-base text-slate-500">
          Définissez les montants attendus par tranche pour chaque classe (année scolaire active).
        </p>

        <div>
          <label className="block text-base font-medium text-slate-700 mb-1">Classe</label>
          <select
            value={trancheClasseId}
            onChange={e => loadTranchesForClasse(e.target.value)}
            className="input-field"
          >
            <option value="">Sélectionner une classe</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.nom} ({c.section})</option>
            ))}
          </select>
        </div>

        {trancheClasseId && (
          <div className="space-y-3">
            {tranches.map((t, i) => (
              <div key={t.tranche_numero} className="grid grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">Tranche {t.tranche_numero}</label>
                  <input type="number" min={0} value={t.montant_attendu || ''}
                    onChange={e => updateTranche(i, 'montant_attendu', e.target.value)}
                    placeholder="Montant FCFA"
                    className="input-field" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-slate-500 mb-1">Date limite (optionnel)</label>
                  <input type="date" value={t.date_limite}
                    onChange={e => updateTranche(i, 'date_limite', e.target.value)}
                    className="input-field" />
                </div>
              </div>
            ))}
            <button onClick={handleSaveTranches} disabled={savingTranches} className="btn-primary">
              {savingTranches ? 'Enregistrement...' : 'Enregistrer les tranches'}
            </button>
          </div>
        )}
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-lg border-b border-slate-100 pb-3 flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-500" />
          Sauvegarde des données
        </h2>

        <p className="text-base text-slate-500">
          Une sauvegarde automatique quotidienne est effectuée (7 derniers jours conservés).
        </p>

        <div className="flex gap-3">
          <button onClick={() => handleBackup('manual')} className="btn-primary flex items-center gap-2">
            <Database className="w-5 h-5" />
            Sauvegarde manuelle
          </button>
          <button onClick={() => handleBackup('export')}
            className="border border-slate-200 text-slate-600 font-semibold rounded-lg px-5 py-3 text-base hover:bg-slate-50 transition-colors">
            Exporter .db
          </button>
        </div>

        {backups.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500 mb-2">Sauvegardes récentes</p>
            <div className="space-y-1">
              {backups.slice(0, 5).map(b => (
                <div key={b.name} className="flex justify-between text-sm text-slate-600 py-1">
                  <span>{b.date}</span>
                  <span>{(b.size / 1024).toFixed(0)} Ko</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 text-lg border-b border-slate-100 pb-3 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-emerald-500" />
          Dossier de données
        </h2>
        <p className="text-base text-slate-500">
          Toutes les données (base SQLite, photos, sauvegardes, exports PDF) sont stockées localement dans :
        </p>
        <code className="block bg-slate-100 text-slate-700 px-4 py-3 rounded-xl text-sm font-mono break-all">
          {dataPath}
        </code>
        <ul className="text-sm text-slate-500 space-y-1 list-disc list-inside">
          <li><strong>schoolmanager.db</strong> — base de données</li>
          <li><strong>uploads/eleves/</strong> — photos des élèves</li>
          <li><strong>backups/</strong> — sauvegardes automatiques</li>
          <li><strong>exports/</strong> — listes de classe exportées</li>
        </ul>
        {typeof window !== 'undefined' && window.electronAPI?.openDataFolder && (
          <button
            type="button"
            onClick={() => window.electronAPI!.openDataFolder()}
            className="btn-secondary flex items-center gap-2"
          >
            <FolderOpen className="w-5 h-5" /> Ouvrir le dossier
          </button>
        )}
      </div>
      </div>
    </PageShell>
  )
}
