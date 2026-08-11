'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Check, Gift, UserPlus, Phone, Building2, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSupportWhatsAppUrl } from '@/lib/support'

interface Parrainage {
  id: string
  contact_nom: string
  contact_ecole: string | null
  contact_telephone: string
  statut: string
  commission_montant: number | null
  created_at: string
}

interface ReferralData {
  code: string
  commissionPct: number
  ecoleNom: string
  directeurNom: string | null
  parrainages: Parrainage[]
  stats: {
    enCours: number
    actifs: number
    verses: number
    totalCommission: number
  }
}

const STATUT_LABELS: Record<string, string> = {
  en_cours: 'En cours',
  abonnement_actif: 'Abonnement actif',
  commission_versee: 'Commission versée',
  annule: 'Annulé',
}

export default function ReferralProgram() {
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    contact_nom: '',
    contact_ecole: '',
    contact_telephone: '',
    notes: '',
  })

  const fetchReferral = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/licence/referral')
    if (res.ok) {
      setData(await res.json())
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchReferral() }, [fetchReferral])

  const copyCode = async () => {
    if (!data?.code) return
    await navigator.clipboard.writeText(data.code)
    setCopied(true)
    toast.success('Code copié')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareWhatsApp = () => {
    if (!data) return
    const msg = [
      'Bonjour, je parraine une école intéressée par SchoolManager.',
      '',
      `Code parrain : ${data.code}`,
      `Établissement parrain : ${data.ecoleNom}`,
      data.directeurNom ? `Directeur : ${data.directeurNom}` : '',
      '',
      'Merci de me recontacter pour finaliser l\'abonnement.',
    ].filter(Boolean).join('\n')
    window.open(getSupportWhatsAppUrl(msg), '_blank', 'noopener,noreferrer')
  }

  const submitContact = async () => {
    if (!form.contact_nom.trim() || !form.contact_telephone.trim()) {
      toast.error('Nom et téléphone requis')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/licence/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      toast.error(json.error || 'Erreur')
      return
    }
    toast.success(json.cloudSynced ? 'Contact enregistré et synchronisé' : 'Contact enregistré (sync cloud à la prochaine connexion)')
    setForm({ contact_nom: '', contact_ecole: '', contact_telephone: '', notes: '' })
    setData(prev => prev ? { ...prev, parrainages: json.parrainages, stats: json.stats } : prev)
  }

  if (loading) {
    return (
      <div className="card p-8 text-center text-slate-400 text-sm">Chargement du parrainage...</div>
    )
  }

  if (!data) return null

  return (
    <div className="card overflow-hidden">
      <div className="p-6 bg-gradient-to-br from-violet-50 to-emerald-50 border-b border-slate-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/25">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-800">Programme de parrainage</h3>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Recommandez SchoolManager à un autre établissement. Lorsque son{' '}
              <strong>abonnement est finalisé</strong>, vous touchez{' '}
              <strong className="text-violet-700">{data.commissionPct}&nbsp;%</strong> du montant en commission.
              Les leads se synchronisent avec le serveur lorsque vous êtes connecté à Internet.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-mono text-sm font-semibold text-slate-800">
            {data.code}
            <button
              type="button"
              onClick={copyCode}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              title="Copier le code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={shareWhatsApp}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Nous contacter avec mon code
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-slate-400" />
            Signaler un contact intéressé
          </h4>
          <div className="space-y-3">
            <input
              value={form.contact_nom}
              onChange={e => setForm(f => ({ ...f, contact_nom: e.target.value }))}
              placeholder="Nom du directeur / responsable *"
              className="input-field text-sm"
            />
            <input
              value={form.contact_ecole}
              onChange={e => setForm(f => ({ ...f, contact_ecole: e.target.value }))}
              placeholder="Nom de l'établissement"
              className="input-field text-sm"
            />
            <input
              value={form.contact_telephone}
              onChange={e => setForm(f => ({ ...f, contact_telephone: e.target.value }))}
              placeholder="Téléphone WhatsApp *"
              className="input-field text-sm"
            />
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Précisions (ville, nombre d'élèves...)"
              rows={2}
              className="input-field text-sm resize-none"
            />
            <button
              type="button"
              onClick={submitContact}
              disabled={submitting}
              className="btn-primary w-full text-sm py-2.5"
            >
              {submitting ? 'Envoi...' : 'Enregistrer le contact'}
            </button>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-lg font-bold text-slate-800">{data.stats.enCours}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">En cours</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-center">
              <p className="text-lg font-bold text-emerald-700">{data.stats.actifs}</p>
              <p className="text-[10px] uppercase tracking-wide text-emerald-600/80">Actifs</p>
            </div>
            <div className="rounded-xl bg-violet-50 p-3 text-center">
              <p className="text-lg font-bold text-violet-700">
                {data.stats.totalCommission > 0
                  ? `${data.stats.totalCommission.toLocaleString('fr-FR')}`
                  : '—'}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-violet-600/80">FCFA gagnés</p>
            </div>
          </div>

          {data.parrainages.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Aucun parrainage enregistré pour le moment.
            </p>
          ) : (
            <ul className="space-y-2 max-h-52 overflow-y-auto">
              {data.parrainages.map(p => (
                <li key={p.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.contact_nom}</p>
                    {p.contact_ecole && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                        <Building2 className="w-3 h-3 shrink-0" /> {p.contact_ecole}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Phone className="w-3 h-3 shrink-0" /> {p.contact_telephone}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600 shrink-0">
                    {STATUT_LABELS[p.statut] ?? p.statut}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
