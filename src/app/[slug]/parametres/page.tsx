'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Save, Database, Calendar, FolderOpen,
  Check, AlertTriangle, Plus, Upload, X, Building2,
  Phone, Mail, MapPin, User, Link as LinkIcon, HardDrive,
  Clock, ChevronRight,
} from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import UsersManagement from '@/components/parametres/UsersManagement'
import SectionIcon from '@/components/ui/SectionIcon'
import { useSchool } from '@/components/layout/SchoolProvider'
import toast from 'react-hot-toast'
import { getDefaultAnneeScolaireLabel } from '@/lib/school-year'

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

export default function ParametresPage() {
  const { slug } = useParams()
  const { userRole, setLogoUrl } = useSchool()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [annees, setAnnees] = useState<AnneeScolaire[]>([])
  const [backups, setBackups] = useState<Backup[]>([])
  const [newAnnee, setNewAnnee] = useState('')
  const [dataPath, setDataPath] = useState('Documents/SchoolManager')
  const [confirmActivate, setConfirmActivate] = useState<AnneeScolaire | null>(null)
  const [backingUp, setBackingUp] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [entetePreview, setEntetePreview] = useState<string | null>(null)
  const [savingEntete, setSavingEntete] = useState(false)

  const [form, setForm] = useState({
    nom: '', telephone: '', adresse: '',
    email: '', directeur_nom: '', logo_url: '', entete_url: '',
    nom_caissier: '',
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
    ]).then(([ecoleData, anneeData, backupData]) => {
      if (ecoleData.ecole) {
        setForm({
          nom: ecoleData.ecole.nom || '',
          telephone: ecoleData.ecole.telephone || '',
          adresse: ecoleData.ecole.adresse || '',
          email: ecoleData.ecole.email || '',
          directeur_nom: ecoleData.ecole.directeur_nom || '',
          logo_url: ecoleData.ecole.logo_url || '',
          entete_url: ecoleData.ecole.entete_url || '',
          nom_caissier: ecoleData.ecole.nom_caissier || '',
        })
        if (ecoleData.ecole.logo_url) setLogoPreview(ecoleData.ecole.logo_url)
        if (ecoleData.ecole.entete_url) setEntetePreview(ecoleData.ecole.entete_url)
      }
      setAnnees(anneeData.annees || [])
      setBackups(backupData.backups || [])
      setLoading(false)
    })
  }, [])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setLogoPreview(result)
      up('logo_url', result)
      setLogoUrl(result)
    }
    reader.readAsDataURL(file)
  }

  const handleEnteteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image trop lourde (max 2 Mo)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setEntetePreview(result)
      up('entete_url', result)
    }
    reader.readAsDataURL(file)
  }

  const handleEnteteSave = async () => {
    setSavingEntete(true)
    const res = await fetch('/api/ecole', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entete_url: form.entete_url, nom_caissier: form.nom_caissier }),
    })
    setSavingEntete(false)
    if (res.ok) toast.success('En-tête officielle sauvegardée')
    else toast.error('Erreur lors de la sauvegarde')
  }

  const handleEnteteDelete = async () => {
    setEntetePreview(null)
    up('entete_url', '')
    setSavingEntete(true)
    const res = await fetch('/api/ecole', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entete_url: '' }),
    })
    setSavingEntete(false)
    if (res.ok) toast.success('En-tête supprimée')
    else toast.error('Erreur lors de la suppression')
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/ecole', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setLogoUrl(form.logo_url || null)
      toast.success('Paramètres sauvegardés')
    }
    else toast.error('Erreur lors de la sauvegarde')
  }

  const handleAddAnnee = async () => {
    if (!newAnnee.trim()) return
    const res = await fetch('/api/annees-scolaires', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newAnnee, is_active: annees.length === 0 }),
    })
    if (!res.ok) { toast.error("Erreur lors de l'ajout"); return }
    const data = await fetch('/api/annees-scolaires').then(r => r.json())
    setAnnees(data.annees || [])
    setNewAnnee('')
    toast.success('Année scolaire ajoutée')
  }

  const handleActivateAnnee = async (annee: AnneeScolaire) => {
    await fetch('/api/annees-scolaires', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: annee.id, is_active: true }),
    })
    const data = await fetch('/api/annees-scolaires').then(r => r.json())
    setAnnees(data.annees || [])
    setConfirmActivate(null)
    toast.success(`Année ${annee.label} activée`)
  }

  const handleBackup = async (action: 'manual' | 'export') => {
    if (action === 'manual') setBackingUp(true)
    else setExporting(true)

    const res = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await res.json()

    if (action === 'manual') setBackingUp(false)
    else setExporting(false)

    if (data.success) {
      toast.success(action === 'manual' ? 'Sauvegarde créée avec succès' : 'Export réalisé')
      const backupData = await fetch('/api/backup').then(r => r.json())
      setBackups(backupData.backups || [])
    } else {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const handleRestore = async () => {
    if (typeof window === 'undefined' || !window.electronAPI?.restoreDatabase) return

    setRestoring(true)
    try {
      const result = await window.electronAPI.restoreDatabase()
      // Si succès, main.js relance l'app avant même que ce code ne s'exécute.
      // On ne gère donc ici que l'annulation et l'échec.
      if (!result?.success && !result?.canceled) {
        toast.error(result?.error || 'Erreur lors de la restauration')
      }
    } catch (err) {
      toast.error('Erreur lors de la restauration')
    } finally {
      setRestoring(false)
    }
  }

  const activeAnnee = annees.find(a => a.is_active)

  if (loading) return (
    <PageShell title="Paramètres" subtitle="" breadcrumb="Paramètres">
      <div className="flex items-center justify-center h-48 text-slate-400">Chargement...</div>
    </PageShell>
  )

  return (
    <PageShell
      title="Paramètres"
      subtitle="Configuration de votre établissement"
      breadcrumb="Paramètres"
      fullWidth
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 max-w-7xl">

        {/* Identité — 8 cols */}
        <section className="card overflow-hidden xl:col-span-8">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <SectionIcon icon={Building2} tone="emerald" />
            <div>
              <h2 className="font-semibold text-slate-800">Informations de l&apos;école</h2>
              <p className="text-xs text-slate-400">Bulletins, sidebar et filigrane de l&apos;application</p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex flex-col sm:flex-row gap-5 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-emerald-50/30 border border-slate-100">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-emerald-200/80 flex items-center justify-center overflow-hidden bg-white shrink-0 shadow-sm mx-auto sm:mx-0">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-1.5" />
                ) : (
                  <Building2 className="w-9 h-9 text-slate-300" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm font-semibold text-slate-800 mb-0.5">Logo de l&apos;établissement</p>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  S&apos;affiche dans la barre latérale et en filigrane discret sur toutes les pages.
                  PNG ou JPG, fond transparent recommandé.
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-lg px-3 py-2 transition">
                    <Upload className="w-4 h-4" strokeWidth={1.75} />
                    {logoPreview ? 'Changer' : 'Uploader'}
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                  {logoPreview && (
                    <button
                      onClick={() => { setLogoPreview(null); up('logo_url', ''); setLogoUrl(null) }}
                      className="text-sm text-red-500 hover:text-red-600 inline-flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-red-50 transition"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={1.75} /> Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} /> Nom de l&apos;établissement</span>
                </label>
                <input value={form.nom} onChange={e => up('nom', e.target.value)} className="input-field" placeholder="Ex: École Primaire Sainte-Marie" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} /> Nom du directeur</span>
                </label>
                <input value={form.directeur_nom} onChange={e => up('directeur_nom', e.target.value)} className="input-field" placeholder="Ex: M. Jean KAMGA" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} /> Téléphone</span>
                </label>
                <input value={form.telephone} onChange={e => up('telephone', e.target.value)} className="input-field" placeholder="Ex: +237 6XX XXX XXX" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} /> Email</span>
                </label>
                <input value={form.email} onChange={e => up('email', e.target.value)} className="input-field" placeholder="Ex: contact@ecole.cm" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} /> Adresse</span>
                </label>
                <textarea value={form.adresse} onChange={e => up('adresse', e.target.value)}
                  rows={2} className="input-field resize-none" placeholder="Ex: Quartier Bastos, Yaoundé" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} /> Identifiant URL</span>
                </label>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <span className="px-3 py-2.5 text-sm text-slate-400 border-r border-slate-200 bg-slate-100">
                    schoolmanager/
                  </span>
                  <span className="px-3 py-2.5 text-sm text-slate-600 font-mono">{slug}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">L&apos;identifiant URL ne peut pas être modifié</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button onClick={handleSave} disabled={saving}
                className="btn-primary flex items-center gap-2">
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sauvegarde...</>
                ) : (
                  <><Save className="w-4 h-4" /> Sauvegarder</>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Années scolaires — 4 cols */}
        <section className="card overflow-hidden xl:col-span-4">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <SectionIcon icon={Calendar} tone="blue" />
            <div>
              <h2 className="font-semibold text-slate-800">Années scolaires</h2>
              <p className="text-xs text-slate-400">
                {activeAnnee ? `Active : ${activeAnnee.label}` : 'Aucune année active'}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex gap-2">
              <input
                value={newAnnee}
                onChange={e => setNewAnnee(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddAnnee()}
                placeholder={`Ex: ${getDefaultAnneeScolaireLabel()}`}
                className="input-field flex-1"
              />
              <button onClick={handleAddAnnee} disabled={!newAnnee.trim()}
                className="btn-primary flex items-center gap-2 px-4 disabled:opacity-50">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            {annees.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                Aucune année scolaire configurée
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {annees.map(a => (
                  <div key={a.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      a.is_active
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}>
                    <div className="flex items-center gap-3">
                      <Calendar className={`w-4 h-4 ${a.is_active ? 'text-emerald-500' : 'text-slate-300'}`} />
                      <span className={`font-medium text-sm ${a.is_active ? 'text-emerald-800' : 'text-slate-700'}`}>
                        {a.label}
                      </span>
                    </div>
                    {a.is_active ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <button onClick={() => setConfirmActivate(a)}
                        className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-emerald-600 transition-colors">
                        Activer <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* En-tête documents — 6 cols */}
        <section className="card overflow-hidden xl:col-span-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <SectionIcon icon={Upload} tone="rose" />
            <div>
              <h2 className="font-semibold text-slate-800">En-tête officielle</h2>
              <p className="text-xs text-slate-400">Reçus, bulletins et fiches élèves · MINEDUB par défaut</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {entetePreview ? (
              <div className="space-y-3">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <img src={entetePreview} alt="En-tête" className="max-h-20 object-contain mx-auto" />
                </div>
                <div className="flex gap-3">
                  <label className="flex-1 cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleEnteteChange} />
                    <span className="block text-center border border-slate-200 text-slate-600 font-semibold rounded-lg px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors">
                      Remplacer
                    </span>
                  </label>
                  <button onClick={handleEnteteDelete} disabled={savingEntete}
                    className="flex-1 border border-red-200 text-red-600 font-semibold rounded-lg px-4 py-2.5 text-sm hover:bg-red-50 transition-colors disabled:opacity-50">
                    Supprimer
                  </button>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input type="file" accept="image/*" className="hidden" onChange={handleEnteteChange} />
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                  <div className="flex justify-center mb-3">
                    <SectionIcon icon={Upload} tone="slate" size="sm" />
                  </div>
                  <p className="font-medium text-slate-700 text-sm mt-3">Uploader l&apos;en-tête</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG — max 2 Mo · bandeau large 1600×160px</p>
                </div>
              </label>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} /> Nom du caissier</span>
              </label>
              <input
                value={form.nom_caissier}
                onChange={e => up('nom_caissier', e.target.value)}
                className="input-field"
                placeholder="Ex: Mme NGONO Sylvie"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button onClick={handleEnteteSave} disabled={savingEntete}
                className="btn-primary flex items-center gap-2 text-sm">
                {savingEntete ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sauvegarde...</>
                ) : (
                  <><Save className="w-4 h-4" strokeWidth={1.75} /> Sauvegarder l&apos;en-tête</>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Stockage — 6 cols */}
        <section className="card overflow-hidden xl:col-span-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <SectionIcon icon={FolderOpen} tone="amber" />
            <div>
              <h2 className="font-semibold text-slate-800">Stockage local</h2>
              <p className="text-xs text-slate-400">Emplacement des données sur cet ordinateur</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <code className="block bg-slate-50 border border-slate-100 text-slate-600 px-4 py-3 rounded-xl text-sm font-mono break-all">
              {dataPath}
            </code>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'schoolmanager.db', desc: 'Base de données' },
                { label: 'uploads/eleves/', desc: 'Photos des élèves' },
                { label: 'backups/', desc: 'Sauvegardes auto' },
                { label: 'exports/', desc: 'Listes exportées' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-mono text-slate-600">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {typeof window !== 'undefined' && window.electronAPI?.openDataFolder && (
              <button
                type="button"
                onClick={() => window.electronAPI!.openDataFolder()}
                className="btn-secondary flex items-center gap-2 w-full justify-center"
              >
                <FolderOpen className="w-4 h-4" /> Ouvrir le dossier
              </button>
            )}
          </div>
        </section>

        {/* Utilisateurs — pleine largeur */}
        {(userRole === 'admin' || userRole === 'super_admin') && (
          <section className="xl:col-span-12">
            <UsersManagement />
          </section>
        )}

        {/* Sauvegarde — pleine largeur */}
        <section className="card overflow-hidden xl:col-span-12">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <SectionIcon icon={Database} tone="violet" />
            <div>
              <h2 className="font-semibold text-slate-800">Sauvegarde des données</h2>
              <p className="text-xs text-slate-400">Sauvegarde automatique quotidienne · 7 derniers jours conservés</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              <button onClick={() => handleBackup('manual')} disabled={backingUp}
                className="btn-primary flex items-center gap-2">
                {backingUp
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sauvegarde...</>
                  : <><Database className="w-4 h-4" /> Sauvegarde manuelle</>
                }
              </button>
              <button onClick={() => handleBackup('export')} disabled={exporting}
                className="btn-secondary flex items-center gap-2">
                {exporting
                  ? <><div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" /> Export...</>
                  : <><HardDrive className="w-4 h-4" /> Exporter .db</>
                }
              </button>
              {typeof window !== 'undefined' && window.electronAPI?.restoreDatabase && (
                <button onClick={handleRestore} disabled={restoring}
                  className="flex items-center gap-2 border border-amber-200 text-amber-700 font-semibold rounded-lg px-4 py-2.5 text-sm hover:bg-amber-50 transition-colors disabled:opacity-50">
                  {restoring
                    ? <><div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin" /> Restauration...</>
                    : <><AlertTriangle className="w-4 h-4" /> Restaurer une sauvegarde</>
                  }
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400">
              La restauration remplace la base actuelle par un fichier .db choisi sur votre ordinateur. L&apos;application redémarre automatiquement une fois terminée.
            </p>

            {backups.length > 0 && (
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sauvegardes récentes</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {backups.slice(0, 5).map(b => (
                    <div key={b.name} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-sm text-slate-600">{b.date}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{(b.size / 1024).toFixed(0)} Ko</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

      </div>

      {/* ── Modal confirmation activation année ──────────────────── */}
      {confirmActivate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-1">Changer l&apos;année active ?</h3>
                <p className="text-sm text-slate-500">
                  Vous êtes sur le point d&apos;activer l&apos;année <strong>{confirmActivate.label}</strong>.
                  Toutes les données (classes, élèves, paiements, notes) seront filtrées selon cette année.
                </p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5">
              <p className="text-xs text-amber-700">
                ⚠️ Cette action ne supprime aucune donnée. Vous pouvez revenir à une année précédente à tout moment.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmActivate(null)} className="btn-secondary">
                Annuler
              </button>
              <button onClick={() => handleActivateAnnee(confirmActivate)} className="btn-primary">
                Oui, activer {confirmActivate.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}