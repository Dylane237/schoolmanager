'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, User, Phone, MapPin, Calendar, GraduationCap,
  CreditCard, BookOpen, Clock, Edit2, Save, X, Printer,
  ExternalLink, AlertCircle, TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PhotoUpload from '@/components/eleves/PhotoUpload'
import Badge from '@/components/ui/Badge'
import { formatMoyenne, getNoteMax } from '@/lib/notes-utils'

interface Eleve {
  id: string
  numero_matricule: string
  nom: string
  prenom: string
  date_naissance: string
  lieu_naissance: string
  sexe: string
  photo_url: string
  section: string
  statut: string
  statut_annuel: string
  annee_entree: string
  classe_nom: string
  classe_section: string
  classe_id: string
}

interface ClasseOption { id: string; nom: string; section: string }

interface Parent {
  id: string
  nom: string
  prenom: string
  telephone: string
  lien: string
  est_principal: number
}

interface Paiement {
  id: string
  tranche_numero: number
  montant: number
  date_paiement: string
  mode_paiement: string
  recu_numero: string
}

interface Note {
  id: string
  matiere_nom: string
  coefficient: number
  periode: string
  note: number
  appreciation: string
}

interface Presence {
  id: string
  date: string
  statut: string
  note: string
}

interface Situation {
  total_paye: number
  total_attendu: number
  total_reste: number
  statut: string
  tranches: { tranche_numero: number; montant_attendu: number; montant_paye: number; reste: number; statut: string }[]
}

function calcAge(dateNaissance: string | null): number | null {
  if (!dateNaissance) return null
  const birth = new Date(dateNaissance)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const PAIEMENT_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paye: 'success', partiel: 'warning', impaye: 'danger', non_configure: 'neutral',
}

export default function FicheElevePage() {
  const { slug, id } = useParams() as { slug: string; id: string }
  const router = useRouter()

  const [eleve, setEleve] = useState<Eleve | null>(null)
  const [parents, setParents] = useState<Parent[]>([])
  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [presences, setPresences] = useState<Presence[]>([])
  const [situation, setSituation] = useState<Situation | null>(null)
  const [classes, setClasses] = useState<ClasseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [onglet, setOnglet] = useState<'infos' | 'paiements' | 'notes' | 'presences'>('infos')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Eleve>>({})
  const [periodeFiltre, setPeriodeFiltre] = useState('tous')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/eleves/${id}`)
    if (!res.ok) { router.push(`/${slug}/eleves`); return }
    const data = await res.json()
    setEleve(data.eleve)
    setForm(data.eleve)
    setParents(data.parents || [])
    setPaiements(data.paiements || [])
    setNotes(data.notes || [])
    setPresences(data.presences || [])
    setSituation(data.situation || null)
    setClasses(data.classes || [])
    setLoading(false)
  }, [id, slug, router])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch(`/api/eleves/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (!res.ok) {
      toast.error('Erreur lors de l\'enregistrement')
      setSaving(false)
      return
    }
    await fetchData()
    setEditing(false)
    setSaving(false)
    toast.success('Fiche mise à jour')
  }

  const handlePrint = async () => {
    const res = await fetch(`/api/eleves/${id}`)
    const data = await res.json()
    if (!res.ok) return

    const periodes = [...new Set((data.notes as Note[]).map(n => n.periode))].sort()
    const derniere = periodes[periodes.length - 1]
    const ns = (data.notes as Note[]).filter(n => n.periode === derniere)
    const totalCoef = ns.reduce((s, n) => s + n.coefficient, 0)
    const totalPts = ns.reduce((s, n) => s + n.note * n.coefficient, 0)
    const moy = totalCoef ? (totalPts / totalCoef).toFixed(2) : null

    const totalPres = (data.presences as Presence[]).length
    const nbPresent = (data.presences as Presence[]).filter(p => p.statut === 'present').length
    const taux = totalPres ? Math.round((nbPresent / totalPres) * 100) : null

    const { buildFicheEleveHtml } = await import('@/lib/class-list-export')
    const html = buildFicheEleveHtml({
      ecoleNom: data.ecoleNom || 'École',
      eleve: data.eleve,
      parents: data.parents || [],
      situation: data.situation || { total_paye: 0, total_attendu: 0, total_reste: 0, statut: '—' },
      moyenne: moy,
      tauxPresence: taux,
    })

    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) { toast.error('Autorisez les pop-ups'); return }
    win.document.write(html)
    win.document.close()
    win.onload = () => win.print()
  }

  const up = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  const totalPaye = situation?.total_paye ?? paiements.reduce((s, p) => s + p.montant, 0)
  const totalAttendu = situation?.total_attendu ?? 0
  const totalReste = situation?.total_reste ?? 0
  const pctPaye = totalAttendu > 0 ? Math.min(100, Math.round((totalPaye / totalAttendu) * 100)) : null

  const totalPresences = presences.length
  const nbPresent = presences.filter(p => p.statut === 'present').length
  const tauxPresence = totalPresences ? Math.round((nbPresent / totalPresences) * 100) : null

  const periodes = [...new Set(notes.map(n => n.periode))].sort()
  const dernieresPeriode = periodes[periodes.length - 1]
  const notesFiltrees = periodeFiltre === 'tous' ? notes : notes.filter(n => n.periode === periodeFiltre)
  const moyenneGenerale = () => {
    const ns = notes.filter(n => n.periode === dernieresPeriode)
    if (!ns.length) return null
    const totalCoef = ns.reduce((s, n) => s + n.coefficient, 0)
    const totalPoints = ns.reduce((s, n) => s + n.note * n.coefficient, 0)
    return totalCoef ? (totalPoints / totalCoef).toFixed(2) : null
  }

  const statutPresenceStyle = (s: string) => {
    switch (s) {
      case 'present': return 'bg-emerald-100 text-emerald-700'
      case 'absent':  return 'bg-red-100 text-red-700'
      case 'retard':  return 'bg-amber-100 text-amber-700'
      case 'excuse':  return 'bg-blue-100 text-blue-700'
      default:        return 'bg-slate-100 text-slate-600'
    }
  }

  const noteColor = (n: number) => {
    if (n >= 16) return 'text-emerald-600 font-bold'
    if (n >= 12) return 'text-blue-600 font-semibold'
    if (n >= 10) return 'text-amber-600 font-semibold'
    return 'text-red-600 font-bold'
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center h-96">
      <p className="text-slate-400 text-sm">Chargement...</p>
    </div>
  )

  if (!eleve) return null

  const moy = moyenneGenerale()
  const age = calcAge(eleve.date_naissance)

  return (
    <div className="p-8 max-w-5xl mx-auto">

      <button onClick={() => router.push(`/${slug}/eleves`)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Retour aux élèves
      </button>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <PhotoUpload eleveId={eleve.id} photoUrl={eleve.photo_url} compact onUploaded={() => fetchData()} />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{eleve.nom} {eleve.prenom}</h1>
              <p className="text-sm text-slate-500 font-mono mt-0.5">{eleve.numero_matricule}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {age !== null && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 text-violet-700">{age} ans</span>
                )}
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">{eleve.section}</span>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{eleve.classe_nom || 'Aucune classe'}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${eleve.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{eleve.statut}</span>
                {situation && (
                  <Badge variant={PAIEMENT_VARIANT[situation.statut] ?? 'neutral'} size="sm">
                    {situation.statut === 'paye' ? 'Soldé' : situation.statut === 'partiel' ? 'Partiel' : situation.statut === 'impaye' ? 'Impayé' : '—'}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={handlePrint} className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm transition-colors">
              <Printer className="w-4 h-4" /> Imprimer fiche
            </button>
            <Link href={`/${slug}/paiements/nouveau?eleve_id=${id}`} className="flex items-center gap-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors">
              <CreditCard className="w-4 h-4" /> Encaisser
            </Link>
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setForm(eleve) }} className="flex items-center gap-1.5 text-slate-500 border border-slate-200 px-3 py-2 rounded-lg text-sm">
                  <X className="w-4 h-4" /> Annuler
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
                  <Save className="w-4 h-4" /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 border border-slate-200 hover:border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm">
                <Edit2 className="w-4 h-4" /> Modifier
              </button>
            )}
          </div>
        </div>

        {/* Barre progression paiement */}
        {totalAttendu > 0 && (
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500">Situation financière</span>
              <span className="font-semibold text-slate-700">
                {totalPaye.toLocaleString('fr-FR')} / {totalAttendu.toLocaleString('fr-FR')} FCFA
                {totalReste > 0 && <span className="text-red-600 ml-2">Reste : {totalReste.toLocaleString('fr-FR')} F</span>}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full transition-all ${pctPaye === 100 ? 'bg-emerald-500' : pctPaye && pctPaye > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${pctPaye ?? 0}%` }} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{totalPaye.toLocaleString('fr-FR')} F</p>
            <p className="text-xs text-slate-500 mt-0.5">Total payé</p>
          </div>
          <div className="text-center border-x border-slate-100">
            <p className="text-2xl font-bold text-slate-800">
              {moy ? formatMoyenne(parseFloat(moy), eleve.section || eleve.classe_section || 'francophone') : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Moyenne {dernieresPeriode || ''}</p>
          </div>
          <div className="text-center border-r border-slate-100">
            <p className="text-2xl font-bold text-slate-800">{tauxPresence !== null ? `${tauxPresence}%` : '—'}</p>
            <p className="text-xs text-slate-500 mt-0.5">Taux présence</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{notes.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Notes saisies</p>
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Bulletin', href: `/${slug}/notes/bulletins?eleve_id=${id}`, icon: BookOpen },
          { label: 'Présences', href: `/${slug}/presences`, icon: Clock },
          { label: 'Classe', href: eleve.classe_id ? `/${slug}/classes/${eleve.classe_id}` : `/${slug}/classes`, icon: GraduationCap },
          { label: 'Transfert', href: `/${slug}/classes/transferts`, icon: TrendingUp },
        ].map(a => (
          <Link key={a.label} href={a.href} className="card p-3 flex items-center gap-3 hover:border-emerald-300 transition-colors group">
            <a.icon className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-600">{a.label}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-300 ml-auto" />
          </Link>
        ))}
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
        {([
          { key: 'infos', label: 'Informations', icon: User },
          { key: 'paiements', label: 'Paiements', icon: CreditCard },
          { key: 'notes', label: 'Notes', icon: BookOpen },
          { key: 'presences', label: 'Présences', icon: Clock },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setOnglet(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${onglet === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {onglet === 'infos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h2 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" /> Informations personnelles
            </h2>
            <div className="space-y-3">
              {editing ? (
                <>
                  <Field label="Nom"><input value={form.nom || ''} onChange={e => up('nom', e.target.value)} className="input-field" /></Field>
                  <Field label="Prénom"><input value={form.prenom || ''} onChange={e => up('prenom', e.target.value)} className="input-field" /></Field>
                  <Field label="Sexe">
                    <select value={form.sexe || ''} onChange={e => up('sexe', e.target.value)} className="input-field">
                      <option value="M">Masculin</option><option value="F">Féminin</option>
                    </select>
                  </Field>
                  <Field label="Date de naissance"><input type="date" value={form.date_naissance || ''} onChange={e => up('date_naissance', e.target.value)} className="input-field" /></Field>
                  <Field label="Lieu de naissance"><input value={form.lieu_naissance || ''} onChange={e => up('lieu_naissance', e.target.value)} className="input-field" /></Field>
                  <Field label="Classe">
                    <select value={form.classe_id || ''} onChange={e => up('classe_id', e.target.value)} className="input-field">
                      <option value="">— Aucune —</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.section})</option>)}
                    </select>
                  </Field>
                  <Field label="Statut annuel">
                    <select value={form.statut_annuel || ''} onChange={e => up('statut_annuel', e.target.value)} className="input-field">
                      <option value="">—</option>
                      <option value="admis">Admis</option>
                      <option value="redoublant">Redoublant</option>
                      <option value="en_attente">En attente</option>
                    </select>
                  </Field>
                </>
              ) : (
                <>
                  <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Sexe" value={eleve.sexe === 'M' ? 'Masculin' : 'Féminin'} />
                  <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Date naissance" value={eleve.date_naissance ? `${eleve.date_naissance}${age !== null ? ` (${age} ans)` : ''}` : '—'} />
                  <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Lieu naissance" value={eleve.lieu_naissance || '—'} />
                  <InfoRow icon={<GraduationCap className="w-3.5 h-3.5" />} label="Classe" value={eleve.classe_nom || '—'} />
                  <InfoRow icon={<GraduationCap className="w-3.5 h-3.5" />} label="Année entrée" value={eleve.annee_entree || '—'} />
                  <InfoRow icon={<GraduationCap className="w-3.5 h-3.5" />} label="Statut annuel" value={eleve.statut_annuel || '—'} />
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-5">
              <h2 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" /> Parents / Tuteurs
              </h2>
              {parents.length === 0 ? (
                <p className="text-slate-400 text-sm">Aucun parent enregistré</p>
              ) : (
                <div className="space-y-4">
                  {parents.map(p => (
                    <div key={p.id} className="border border-slate-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-slate-800 text-sm">{p.nom} {p.prenom}</p>
                        {p.est_principal ? <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Principal</span> : null}
                      </div>
                      <p className="text-xs text-slate-500 capitalize mb-1">{p.lien}</p>
                      <a href={`tel:${p.telephone}`} className="text-sm text-emerald-600 font-mono hover:underline">{p.telephone}</a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {situation && situation.tranches.length > 0 && (
              <div className="card p-5">
                <h2 className="font-semibold text-slate-700 text-sm mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-400" /> Détail des tranches
                </h2>
                <div className="space-y-2">
                  {situation.tranches.map(t => (
                    <div key={t.tranche_numero} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0">
                      <span className="text-slate-600">Tranche {t.tranche_numero}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{t.montant_paye.toLocaleString('fr-FR')} / {t.montant_attendu.toLocaleString('fr-FR')} F</span>
                        <Badge variant={PAIEMENT_VARIANT[t.statut] ?? 'neutral'} size="sm">{t.statut}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {onglet === 'paiements' && (
        <div className="card overflow-hidden">
          {paiements.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <p className="mb-4">Aucun paiement enregistré</p>
              <Link href={`/${slug}/paiements/nouveau?eleve_id=${id}`} className="btn-primary inline-flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Enregistrer un paiement
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Date', 'Tranche', 'Montant', 'Mode', 'Reçu'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paiements.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-600">{p.date_paiement}</td>
                    <td className="px-4 py-3">
                      {p.tranche_numero ? <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700">Tranche {p.tranche_numero}</span> : <span className="text-xs text-slate-400">Frais annexe</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 text-sm">{p.montant.toLocaleString('fr-FR')} F</td>
                    <td className="px-4 py-3 text-sm text-slate-500 capitalize">{p.mode_paiement || '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-400">{p.recu_numero || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-slate-600">Total</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{totalPaye.toLocaleString('fr-FR')} F</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {onglet === 'notes' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-slate-500">Période :</span>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setPeriodeFiltre('tous')} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${periodeFiltre === 'tous' ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>Toutes</button>
              {periodes.map(p => (
                <button key={p} onClick={() => setPeriodeFiltre(p)} className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${periodeFiltre === p ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="card overflow-hidden">
            {notesFiltrees.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">Aucune note enregistrée</div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{['Matière', 'Période', `Note /${getNoteMax(eleve.section || 'francophone')}`, 'Coef.', 'Appréciation'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notesFiltrees.map(n => (
                    <tr key={n.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{n.matiere_nom}</td>
                      <td className="px-4 py-3"><span className="text-xs capitalize px-2 py-1 rounded-full bg-slate-100 text-slate-600">{n.periode}</span></td>
                      <td className={`px-4 py-3 text-sm ${noteColor(n.note)}`}>{n.note}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{n.coefficient}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 italic">{n.appreciation || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {onglet === 'presences' && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Présent', statut: 'present', color: 'text-emerald-600' },
              { label: 'Absent', statut: 'absent', color: 'text-red-600' },
              { label: 'Retard', statut: 'retard', color: 'text-amber-600' },
              { label: 'Excusé', statut: 'excuse', color: 'text-blue-600' },
            ].map(({ label, statut, color }) => (
              <div key={statut} className="card p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{presences.filter(p => p.statut === statut).length}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <div className="card overflow-hidden">
            {presences.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">Aucune présence enregistrée</div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>{['Date', 'Statut', 'Observation'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {presences.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600">{p.date}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statutPresenceStyle(p.statut)}`}>{p.statut}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-500">{p.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>{children}</div>)
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="flex items-center gap-1.5 text-xs text-slate-400">{icon} {label}</span>
      <span className="text-sm text-slate-700 font-medium">{value}</span>
    </div>
  )
}
