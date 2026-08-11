'use client'

import { useState, useEffect, useCallback } from 'react'
import { Copy, Check, Plus, Gift, Pencil, Search } from 'lucide-react'
import { AdminLicencesShell, AdminBadge } from '@/components/admin-licences/AdminShell'
import { SchoolIdentity } from '@/components/admin-licences/SchoolIdentity'
import { CreateKeyModal } from '@/components/admin-licences/CreateKeyModal'
import { EditSchoolModal } from '@/components/admin-licences/EditSchoolModal'
import {
  type AdminLicence,
  PLAN_COLORS,
  isLicenceAssigned,
  hasSchoolName,
  resolveEcoleNom,
  licenceStatus,
  formatDateFr,
} from '@/lib/admin-licences-types'

type Filter = 'toutes' | 'disponibles' | 'attribuees' | 'sans_nom'

function LicenceCard({
  l,
  onRevoke,
  onCopy,
  onEdit,
  copied,
}: {
  l: AdminLicence
  onRevoke: (id: string) => void
  onCopy: (key: string) => void
  onEdit: (l: AdminLicence) => void
  copied: string
}) {
  const assigned = isLicenceAssigned(l)
  const status = licenceStatus(l)

  return (
    <article className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-4 space-y-4">
      <SchoolIdentity licence={l} onEdit={assigned && !hasSchoolName(l) ? () => onEdit(l) : undefined} />

      <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
        <p className="text-[10px] uppercase tracking-wide text-slate-600 mb-1.5">Clé de licence</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs font-mono text-slate-200 break-all">{l.cle_licence}</code>
          <button type="button" onClick={() => onCopy(l.cle_licence)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            {copied === l.cle_licence ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
        {l.parrain_code && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono bg-violet-500/10 text-violet-300 border border-violet-500/25">
            <Gift className="w-3 h-3" />
            {l.parrain_code}
          </span>
        )}
        <span className="text-xs text-slate-500 ml-auto">Expire {formatDateFr(l.date_fin)}</span>
      </div>

      <div className="flex gap-2">
        {assigned && (
          <button
            type="button"
            onClick={() => onEdit(l)}
            className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 inline-flex items-center justify-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            Établissement
          </button>
        )}
        {!!l.is_active && (
          <button
            type="button"
            onClick={() => onRevoke(l.id)}
            className="flex-1 py-2 rounded-xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10"
          >
            Révoquer
          </button>
        )}
      </div>
    </article>
  )
}

function LicencesContent() {
  const [licences, setLicences] = useState<AdminLicence[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('toutes')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editLicence, setEditLicence] = useState<AdminLicence | null>(null)
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
  const sansNom = licences.filter(l => isLicenceAssigned(l) && !hasSchoolName(l)).length

  const filtered = licences.filter(l => {
    if (filter === 'disponibles' && isLicenceAssigned(l)) return false
    if (filter === 'attribuees' && !isLicenceAssigned(l)) return false
    if (filter === 'sans_nom' && (!isLicenceAssigned(l) || hasSchoolName(l))) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const nom = resolveEcoleNom(l)?.toLowerCase() ?? ''
    return (
      l.cle_licence.toLowerCase().includes(q)
      || l.type.toLowerCase().includes(q)
      || nom.includes(q)
      || (l.ecole_slug?.toLowerCase().includes(q) ?? false)
      || (l.parrain_code?.toLowerCase().includes(q) ?? false)
    )
  })

  const filters: { id: Filter; label: string; count?: number; warn?: boolean }[] = [
    { id: 'toutes', label: 'Toutes', count: licences.length },
    { id: 'attribuees', label: 'Attribuées', count: attribuees },
    { id: 'disponibles', label: 'Disponibles', count: disponibles },
    { id: 'sans_nom', label: 'Sans nom', count: sansNom, warn: sansNom > 0 },
  ]

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Licences & établissements</h1>
          <p className="text-sm text-slate-500 mt-1">
            {attribuees} école(s) activée(s) · {disponibles} clé(s) en pool
            {sansNom > 0 && (
              <span className="text-amber-400"> · {sansNom} sans nom synchronisé</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold shrink-0 shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          Nouvelle clé pool
        </button>
      </div>

      {sansNom > 0 && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3 text-sm text-amber-100/90 mb-6">
          <strong>{sansNom} licence(s)</strong> activée(s) sans nom d&apos;établissement en cloud.
          Ouvrez SchoolManager sur chaque poste (sync auto) ou renseignez manuellement via « Établissement ».
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === f.id
                  ? 'bg-slate-800 border-slate-600 text-white'
                  : f.warn
                    ? 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10'
                    : 'border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.label}
              {f.count !== undefined && <span className="ml-1.5 text-xs opacity-70">{f.count}</span>}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom d'école, clé, slug..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 text-sm placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-center text-slate-500 py-16">Chargement...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-slate-500 py-16">Aucune licence trouvée.</p>
      ) : (
        <>
          <div className="grid gap-3 lg:hidden">
            {filtered.map(l => (
              <LicenceCard key={l.id} l={l} onRevoke={revoke} onCopy={copyKey} onEdit={setEditLicence} copied={copied} />
            ))}
          </div>

          <div className="hidden lg:block rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/40">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80 text-left">
                    {['Établissement', 'Clé', 'Plan', 'Parrain', 'Statut', 'Expiration', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filtered.map(l => {
                    const status = licenceStatus(l)
                    const planClass = PLAN_COLORS[l.type] ?? PLAN_COLORS.standard
                    const assigned = isLicenceAssigned(l)
                    return (
                      <tr key={l.id} className="hover:bg-slate-800/25 transition-colors">
                        <td className="px-4 py-4 min-w-[260px]">
                          <SchoolIdentity licence={l} compact onEdit={assigned ? () => setEditLicence(l) : undefined} />
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-1.5 max-w-[200px]">
                            <code className="text-[11px] font-mono text-slate-400 truncate">{l.cle_licence}</code>
                            <button type="button" onClick={() => copyKey(l.cle_licence)} className="p-1 rounded hover:bg-slate-800 text-slate-500 shrink-0">
                              {copied === l.cle_licence ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${planClass}`}>
                            {l.type}
                          </span>
                        </td>
                        <td className="px-4 py-4 align-top font-mono text-xs text-violet-300">{l.parrain_code || '—'}</td>
                        <td className="px-4 py-4 align-top"><AdminBadge tone={status.tone}>{status.label}</AdminBadge></td>
                        <td className="px-4 py-4 align-top text-sm text-slate-400 tabular-nums whitespace-nowrap">{formatDateFr(l.date_fin)}</td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex flex-col gap-1.5">
                            {assigned && (
                              <button type="button" onClick={() => setEditLicence(l)} className="text-xs text-slate-400 hover:text-white text-left">
                                Établissement
                              </button>
                            )}
                            {!!l.is_active && (
                              <button type="button" onClick={() => revoke(l.id)} className="text-xs text-red-400 hover:text-red-300 text-left">
                                Révoquer
                              </button>
                            )}
                          </div>
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
      {editLicence && (
        <EditSchoolModal licence={editLicence} onClose={() => setEditLicence(null)} onSaved={load} />
      )}
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
