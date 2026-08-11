'use client'

import { useState, useEffect, useCallback } from 'react'
import { Copy, Check, Plus, Building2, KeyRound, Gift } from 'lucide-react'
import { AdminLicencesShell, AdminBadge } from '@/components/admin-licences/AdminShell'
import {
  type AdminLicence,
  PLAN_COLORS,
  isLicenceAssigned,
  ecoleDisplayName,
  ecoleSlug,
  licenceStatus,
  formatDateFr,
} from '@/lib/admin-licences-types'

type Filter = 'toutes' | 'disponibles' | 'attribuees'

function CreateKeyModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({ plan: 'standard', date_fin: '' })
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-white mb-5">Nouvelle clé d&apos;activation</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Plan</label>
            <select
              value={form.plan}
              onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 text-sm"
            >
              {['starter', 'standard', 'premium'].map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Date de fin</label>
            <input
              type="date"
              value={form.date_fin}
              onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 text-sm"
            />
          </div>
          {newKey && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-4">
              <p className="text-[10px] uppercase tracking-wide text-emerald-400 font-semibold mb-2">Clé générée</p>
              <div className="flex items-start gap-2">
                <code className="flex-1 text-xs font-mono text-slate-200 break-all">{newKey}</code>
                <button type="button" onClick={copy} className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm">
            Fermer
          </button>
          <button
            type="button"
            onClick={create}
            disabled={creating || !form.date_fin}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50"
          >
            {creating ? 'Génération...' : 'Générer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LicenceCard({
  l,
  onRevoke,
  onCopy,
  copied,
}: {
  l: AdminLicence
  onRevoke: (id: string) => void
  onCopy: (key: string) => void
  copied: string
}) {
  const assigned = isLicenceAssigned(l)
  const school = ecoleDisplayName(l)
  const slug = ecoleSlug(l)
  const status = licenceStatus(l)
  const planClass = PLAN_COLORS[l.type] ?? PLAN_COLORS.standard

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${assigned ? 'bg-emerald-500/15' : 'bg-violet-500/15'}`}>
            {assigned ? <Building2 className="w-5 h-5 text-emerald-400" /> : <KeyRound className="w-5 h-5 text-violet-400" />}
          </div>
          <div className="min-w-0">
            {assigned ? (
              <>
                <h3 className="font-semibold text-white truncate">{school}</h3>
                {slug && <p className="text-xs text-slate-500 font-mono truncate">{slug}</p>}
              </>
            ) : (
              <>
                <h3 className="font-semibold text-violet-300">Clé disponible</h3>
                <p className="text-xs text-slate-500">En attente d&apos;activation</p>
              </>
            )}
          </div>
        </div>
        <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${planClass}`}>
          {l.type.charAt(0).toUpperCase() + l.type.slice(1)}
        </span>
        {l.parrain_code && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-violet-500/10 text-violet-300 border border-violet-500/25">
            <Gift className="w-3 h-3" />
            {l.parrain_code}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
        <code className="flex-1 text-xs font-mono text-slate-300 break-all">{l.cle_licence}</code>
        <button type="button" onClick={() => onCopy(l.cle_licence)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
          {copied === l.cle_licence ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Expire le {formatDateFr(l.date_fin)}</span>
        {l.activated_at && assigned && (
          <span>Activée {formatDateFr(l.activated_at)}</span>
        )}
      </div>

      {!!l.is_active && (
        <button
          type="button"
          onClick={() => onRevoke(l.id)}
          className="w-full py-2 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10"
        >
          Révoquer
        </button>
      )}
    </article>
  )
}

function LicencesContent() {
  const [licences, setLicences] = useState<AdminLicence[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('toutes')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin-licences/list')
    if (res.ok) {
      const data = await res.json()
      setLicences(data.licences || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const revoke = async (id: string) => {
    if (!confirm('Révoquer cette licence ?')) return
    await fetch('/api/admin-licences/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const today = new Date().toISOString().split('T')[0]
  const disponibles = licences.filter(l => !isLicenceAssigned(l) && l.is_active && l.date_fin >= today).length
  const attribuees = licences.filter(l => isLicenceAssigned(l)).length

  const filtered = licences.filter(l => {
    if (filter === 'disponibles' && isLicenceAssigned(l)) return false
    if (filter === 'attribuees' && !isLicenceAssigned(l)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      l.cle_licence.toLowerCase().includes(q)
      || l.type.toLowerCase().includes(q)
      || (ecoleDisplayName(l)?.toLowerCase().includes(q) ?? false)
      || (ecoleSlug(l)?.toLowerCase().includes(q) ?? false)
      || (l.parrain_code?.toLowerCase().includes(q) ?? false)
    )
  })

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: 'toutes', label: 'Toutes', count: licences.length },
    { id: 'attribuees', label: 'Attribuées', count: attribuees },
    { id: 'disponibles', label: 'Disponibles', count: disponibles },
  ]

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Licences</h1>
          <p className="text-sm text-slate-500 mt-1">
            {attribuees} établissement(s) · {disponibles} clé(s) disponible(s)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shrink-0"
        >
          <Plus className="w-4 h-4" />
          Clé d&apos;activation
        </button>
      </div>

      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 text-sm text-blue-200/90 mb-6 leading-relaxed">
        Chaque ligne lie une <strong className="text-blue-100">clé</strong> à un <strong className="text-blue-100">établissement</strong> dès l&apos;inscription sur <code className="text-xs bg-slate-900 px-1.5 py-0.5 rounded">/register</code>.
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === f.id
                  ? 'bg-slate-800 border-slate-600 text-white'
                  : 'border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.label}
              {f.count !== undefined && (
                <span className="ml-1.5 text-xs opacity-70">{f.count}</span>
              )}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher école, clé, parrain..."
          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 text-sm placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
      </div>

      {loading ? (
        <p className="text-center text-slate-500 py-16">Chargement...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-500 py-16">Aucune licence trouvée.</p>
      ) : (
        <>
          {/* Mobile + tablet cards */}
          <div className="grid gap-3 md:hidden">
            {filtered.map(l => (
              <LicenceCard key={l.id} l={l} onRevoke={revoke} onCopy={copyKey} copied={copied} />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/50">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900 text-left">
                    {['Établissement', 'Clé de licence', 'Plan', 'Parrain', 'Statut', 'Expiration', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filtered.map(l => {
                    const assigned = isLicenceAssigned(l)
                    const school = ecoleDisplayName(l)
                    const slug = ecoleSlug(l)
                    const status = licenceStatus(l)
                    const planClass = PLAN_COLORS[l.type] ?? PLAN_COLORS.standard
                    return (
                      <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3.5 min-w-[200px]">
                          {assigned ? (
                            <div>
                              <p className="font-semibold text-white">{school}</p>
                              {slug && <p className="text-xs text-slate-500 font-mono mt-0.5">{slug}</p>}
                              {l.activated_at && (
                                <p className="text-[10px] text-slate-600 mt-1">Activée {formatDateFr(l.activated_at)}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-violet-300 font-medium">— Disponible —</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 max-w-[220px]">
                            <code className="text-xs font-mono text-slate-300 truncate">{l.cle_licence}</code>
                            <button type="button" onClick={() => copyKey(l.cle_licence)} className="p-1 rounded hover:bg-slate-800 text-slate-500 shrink-0">
                              {copied === l.cle_licence ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${planClass}`}>
                            {l.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-violet-300">{l.parrain_code || '—'}</td>
                        <td className="px-4 py-3.5"><AdminBadge tone={status.tone}>{status.label}</AdminBadge></td>
                        <td className="px-4 py-3.5 text-sm text-slate-400 tabular-nums whitespace-nowrap">{formatDateFr(l.date_fin)}</td>
                        <td className="px-4 py-3.5">
                          {!!l.is_active && (
                            <button type="button" onClick={() => revoke(l.id)} className="text-xs text-red-400 hover:text-red-300 font-medium">
                              Révoquer
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <CreateKeyModal open={showForm} onClose={() => setShowForm(false)} onCreated={load} />
    </>
  )
}

export default function AdminLicencesPage() {
  return (
    <AdminLicencesShell>
      <LicencesContent />
    </AdminLicencesShell>
  )
}
