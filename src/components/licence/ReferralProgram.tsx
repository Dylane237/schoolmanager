'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Copy, Check, Gift, UserPlus, Phone, Building2, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getSupportWhatsAppUrl } from '@/lib/support'
import { getIntlLocale, type Locale } from '@/i18n/config'

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

export default function ReferralProgram() {
  const t = useTranslations('licence.referral')
  const tc = useTranslations('common')
  const locale = useLocale() as Locale
  const intlLocale = getIntlLocale(locale)
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
    toast.success(t('codeCopied'))
    setTimeout(() => setCopied(false), 2000)
  }

  const shareWhatsApp = () => {
    if (!data) return
    const director = data.directeurNom
      ? t('directorLine', { name: data.directeurNom })
      : ''
    const msg = t('whatsappMessage', {
      code: data.code,
      school: data.ecoleNom,
      director,
    })
    window.open(getSupportWhatsAppUrl(msg), '_blank', 'noopener,noreferrer')
  }

  const submitContact = async () => {
    if (!form.contact_nom.trim() || !form.contact_telephone.trim()) {
      toast.error(t('requiredFields'))
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
      toast.error(json.error || tc('errorLoad'))
      return
    }
    toast.success(json.cloudSynced ? t('savedSynced') : t('savedOffline'))
    setForm({ contact_nom: '', contact_ecole: '', contact_telephone: '', notes: '' })
    setData(prev => prev ? { ...prev, parrainages: json.parrainages, stats: json.stats } : prev)
  }

  if (loading) {
    return (
      <div className="card p-8 text-center text-slate-400 text-sm">{t('loading')}</div>
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
            <h3 className="text-lg font-bold text-slate-800">{t('title')}</h3>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              {t.rich('description', {
                pct: data.commissionPct,
                strong: (chunks) => <strong className="text-violet-700">{chunks}</strong>,
              })}
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
              title={t('copyCode')}
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
            {t('contactWithCode')}
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-slate-400" />
            {t('reportContact')}
          </h4>
          <div className="space-y-3">
            <input
              value={form.contact_nom}
              onChange={e => setForm(f => ({ ...f, contact_nom: e.target.value }))}
              placeholder={t('contactName')}
              className="input-field text-sm"
            />
            <input
              value={form.contact_ecole}
              onChange={e => setForm(f => ({ ...f, contact_ecole: e.target.value }))}
              placeholder={t('contactSchool')}
              className="input-field text-sm"
            />
            <input
              value={form.contact_telephone}
              onChange={e => setForm(f => ({ ...f, contact_telephone: e.target.value }))}
              placeholder={t('contactPhone')}
              className="input-field text-sm"
            />
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder={t('contactNotes')}
              rows={2}
              className="input-field text-sm resize-none"
            />
            <button
              type="button"
              onClick={submitContact}
              disabled={submitting}
              className="btn-primary w-full text-sm py-2.5"
            >
              {submitting ? t('submitting') : t('saveContact')}
            </button>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-lg font-bold text-slate-800">{data.stats.enCours}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{t('statsInProgress')}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-center">
              <p className="text-lg font-bold text-emerald-700">{data.stats.actifs}</p>
              <p className="text-[10px] uppercase tracking-wide text-emerald-600/80">{t('statsActive')}</p>
            </div>
            <div className="rounded-xl bg-violet-50 p-3 text-center">
              <p className="text-lg font-bold text-violet-700">
                {data.stats.totalCommission > 0
                  ? `${data.stats.totalCommission.toLocaleString(intlLocale)}`
                  : '—'}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-violet-600/80">{t('statsEarned')}</p>
            </div>
          </div>

          {data.parrainages.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">{t('empty')}</p>
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
                    {t(`status.${p.statut as 'en_cours'}`, { defaultValue: p.statut })}
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
