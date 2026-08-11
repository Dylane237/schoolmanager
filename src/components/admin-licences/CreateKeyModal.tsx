'use client'

import { useState } from 'react'
import { Copy, Check, Sparkles, KeyRound } from 'lucide-react'
import { PLAN_HINTS, PLAN_PRICES, defaultLicenceEndDate } from '@/lib/admin-licences-types'

const PLANS = ['starter', 'standard', 'premium'] as const

export function CreateKeyModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({ plan: 'standard', date_fin: defaultLicenceEndDate() })
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const create = async () => {
    if (!form.date_fin) return
    setCreating(true)
    setNewKey('')
    const res = await fetch('/api/admin-licences/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      setNewKey(data.cle)
      onCreated()
    }
    setCreating(false)
  }

  const copy = async () => {
    if (!newKey) return
    await navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const year = new Date().getFullYear()

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-6 pb-4 border-b border-slate-800 bg-gradient-to-br from-emerald-500/10 to-transparent">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Clé pool d&apos;activation</h2>
              <p className="text-xs text-slate-400">Pour une nouvelle école — inscription /register</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-xl bg-slate-950/80 border border-slate-800 px-4 py-3 text-sm text-slate-400 leading-relaxed">
            <p className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                La clé générée reste <strong className="text-slate-200">disponible</strong> jusqu&apos;à ce qu&apos;une école
                s&apos;inscrive. Son nom apparaîtra ici automatiquement après activation.
              </span>
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Choisir le plan</p>
            <div className="grid gap-2">
              {PLANS.map(plan => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, plan }))}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                    form.plan === plan
                      ? 'border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white capitalize">{plan}</span>
                    <span className="text-sm text-emerald-400 tabular-nums">
                      {PLAN_PRICES[plan].toLocaleString('fr-FR')} F
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{PLAN_HINTS[plan]}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Date d&apos;expiration
            </label>
            <input
              type="date"
              value={form.date_fin}
              onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 text-sm"
            />
          </div>

          <div className="rounded-xl border border-dashed border-slate-700 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-600 mb-1">Format de la clé</p>
            <code className="text-xs font-mono text-slate-400">
              {form.plan.toUpperCase()}-POOL-{year}-XXXXXXXX
            </code>
          </div>

          {newKey && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-2">
              <p className="text-[10px] uppercase tracking-wide text-emerald-400 font-semibold">Clé prête à distribuer</p>
              <div className="flex items-start gap-2">
                <code className="flex-1 text-sm font-mono text-white break-all">{newKey}</code>
                <button type="button" onClick={copy} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Communiquez cette clé au directeur — il la saisira lors de la création du compte école.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-2 p-6 pt-0">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-slate-800">
            Fermer
          </button>
          <button
            type="button"
            onClick={create}
            disabled={creating || !form.date_fin}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50"
          >
            {creating ? 'Génération...' : newKey ? 'Regénérer' : 'Générer la clé'}
          </button>
        </div>
      </div>
    </div>
  )
}
