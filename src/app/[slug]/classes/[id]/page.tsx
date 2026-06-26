'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, UserCheck, Users, BookOpen, CreditCard,
  ClipboardList, UserPlus, Phone, Mail, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import PageShell from '@/components/layout/PageShell'
import Badge from '@/components/ui/Badge'
import ClassListActions from '@/components/classes/ClassListActions'
import { findNiveau, sectionLabel } from '@/lib/cameroon-levels'

interface ClasseDetail {
  id: string
  nom: string
  section: string
  niveau: string
  annee_scolaire: string
  capacite_max: number
  nb_eleves: number
  taux_remplissage: number
  enseignant_nom: string | null
  enseignant_prenom: string | null
  enseignant_telephone: string | null
  enseignant_email: string | null
  enseignant_contrat: string | null
  personnel_id: string | null
}

interface Eleve {
  id: string
  nom: string
  prenom: string
  numero_matricule: string
  sexe: string
  total_paye: number
  total_attendu: number
  total_reste: number
  paiement_statut: string
}

interface Enseignant {
  id: string
  nom: string
  prenom: string | null
}

const PAIEMENT_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  paye: 'success',
  partiel: 'warning',
  impaye: 'danger',
  non_configure: 'neutral',
}

export default function ClasseDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [classe, setClasse] = useState<ClasseDetail | null>(null)
  const [eleves, setEleves] = useState<Eleve[]>([])
  const [matieres, setMatieres] = useState<{ id: string; nom: string }[]>([])
  const [enseignants, setEnseignants] = useState<Enseignant[]>([])
  const [stats, setStats] = useState({ nb_eleves: 0, capacite_max: 60, impayes: 0, nb_matieres: 0 })

  const fetchDetail = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/classes/${id}`)
    if (!res.ok) {
      toast.error('Classe introuvable')
      router.push(`/${slug}/classes`)
      return
    }
    const data = await res.json()
    setClasse(data.classe)
    setEleves(data.eleves || [])
    setMatieres(data.matieres || [])
    setEnseignants(data.enseignants || [])
    setStats(data.stats || {})
    setLoading(false)
  }, [id, slug, router])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  const assignEnseignant = async (personnelId: string) => {
    const res = await fetch(`/api/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personnel_id: personnelId || null }),
    })
    if (!res.ok) {
      toast.error('Erreur lors de l\'affectation')
      return
    }
    toast.success('Enseignant titulaire mis à jour')
    fetchDetail()
  }

  if (loading || !classe) {
    return (
      <PageShell title="Classe" breadcrumb="Chargement..." subtitle="">
        <div className="card p-16 text-center text-slate-400">Chargement...</div>
      </PageShell>
    )
  }

  const niveauRef = findNiveau(classe.section as 'francophone' | 'anglophone' | 'maternelle', classe.niveau || classe.nom)
  const plein = stats.nb_eleves >= stats.capacite_max

  return (
    <PageShell
      title={classe.nom}
      subtitle={`${sectionLabel(classe.section)} · ${classe.annee_scolaire}${niveauRef ? ` · ${niveauRef.label}` : ''}`}
      breadcrumb={classe.nom}
      actions={
        <Link href={`/${slug}/classes`} className="btn-secondary flex items-center gap-2 py-2.5">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Élèves inscrits', value: stats.nb_eleves, sub: `/ ${stats.capacite_max} places`, color: 'text-slate-800' },
          { label: 'Remplissage', value: `${classe.taux_remplissage}%`, sub: plein ? 'Classe pleine' : 'Disponible', color: plein ? 'text-red-600' : 'text-emerald-600' },
          { label: 'Matières', value: stats.nb_matieres, sub: 'configurées', color: 'text-slate-800' },
          { label: 'Impayés', value: stats.impayes, sub: 'élève(s)', color: stats.impayes > 0 ? 'text-red-600' : 'text-emerald-600' },
        ].map((s, i) => (
          <div key={i} className="card p-5">
            <p className="text-sm text-slate-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Enseignant titulaire */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-800">Enseignant titulaire</h2>
          </div>
          {classe.enseignant_nom ? (
            <div className="mb-4">
              <p className="font-bold text-lg text-slate-800">
                {classe.enseignant_nom} {classe.enseignant_prenom ?? ''}
              </p>
              {classe.enseignant_contrat && (
                <Badge variant="neutral" size="sm">{classe.enseignant_contrat}</Badge>
              )}
              <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                {classe.enseignant_telephone && (
                  <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{classe.enseignant_telephone}</p>
                )}
                {classe.enseignant_email && (
                  <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" />{classe.enseignant_email}</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm mb-4">Aucun enseignant affecté</p>
          )}
          <select
            value={classe.personnel_id || ''}
            onChange={e => assignEnseignant(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">Choisir un enseignant...</option>
            {enseignants.map(en => (
              <option key={en.id} value={en.id}>{en.nom}{en.prenom ? ` ${en.prenom}` : ''}</option>
            ))}
          </select>
          <Link href={`/${slug}/personnel`} className="text-xs text-emerald-600 hover:underline mt-2 inline-block">
            Gérer le personnel →
          </Link>
        </div>

        {/* Actions rapides */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-semibold text-slate-800 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Inscrire', desc: 'Nouvel élève', href: `/${slug}/eleves/nouveau`, icon: UserPlus, color: 'bg-emerald-100 text-emerald-600' },
              { label: 'Appel', desc: 'Présences', href: `/${slug}/presences`, icon: ClipboardList, color: 'bg-teal-100 text-teal-600' },
              { label: 'Notes', desc: 'Saisie', href: `/${slug}/notes/saisie`, icon: BookOpen, color: 'bg-violet-100 text-violet-600' },
              { label: 'Paiements', desc: 'Situation', href: `/${slug}/paiements`, icon: CreditCard, color: 'bg-amber-100 text-amber-600' },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-sm transition-all text-center group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.color}`}>
                  <a.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-slate-800 group-hover:text-emerald-600">{a.label}</span>
                <span className="text-xs text-slate-400">{a.desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Liste élèves */}
      <div className="card overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Élèves ({eleves.length})</h2>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ClassListActions classeId={id} classeNom={classe.nom} onImported={fetchDetail} />
            <Link href={`/${slug}/eleves?classe_id=${id}`} className="text-sm text-emerald-600 hover:underline font-medium">
              Voir tous →
            </Link>
          </div>
        </div>
        {eleves.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="mb-4">Aucun élève inscrit dans cette classe</p>
            <Link href={`/${slug}/eleves/nouveau`} className="btn-primary inline-flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> Inscrire un élève
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Élève', 'Matricule', 'Paiement', 'Reste dû', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {eleves.map(el => (
                  <tr key={el.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{el.nom} {el.prenom}</p>
                      <p className="text-xs text-slate-400">{el.sexe === 'M' ? 'Garçon' : el.sexe === 'F' ? 'Fille' : ''}</p>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-slate-500">{el.numero_matricule}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant={PAIEMENT_BADGE[el.paiement_statut] ?? 'neutral'} size="sm">
                        {el.paiement_statut === 'paye' ? 'Soldé' : el.paiement_statut === 'partiel' ? 'Partiel' : el.paiement_statut === 'impaye' ? 'Impayé' : '—'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-sm">
                      <span className={el.total_reste > 0 ? 'text-red-600' : 'text-emerald-600'}>
                        {Number(el.total_reste).toLocaleString('fr-FR')} FCFA
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/${slug}/eleves/${el.id}`}
                        className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:underline font-medium">
                        Fiche <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Matières */}
      {matieres.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-slate-500" />
            <h2 className="font-semibold text-slate-800">Matières ({matieres.length})</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {matieres.map(m => (
              <span key={m.id} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">
                {m.nom}
              </span>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  )
}
