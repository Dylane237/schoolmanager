'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Copy, Check, KeyRound, RefreshCw } from 'lucide-react'
import { PLAN_LABELS } from '@/lib/licence-constants'

interface Licence {
  id: string
  ecole_nom: string | null
  ecole_slug: string | null
  type: string
  date_debut: string
  date_fin: string
  is_active: number
  cle_licence: string
  ecole_id: string | null
}

interface Ecole {
  id: string
  nom: string
  slug: string
}

type Mode = 'activation' | 'renewal'

export default function LicencesPage() {
  const [licences, setLicences] = useState<Licence[]>([])
  const [ecoles, setEcoles] = useState<Ecole[]>([])
  const [stats, setStats] = useState({ pool: 0, actives: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [mode, setMode] = useState<Mode>('activation')
  const [saving, setSaving] = useState(false)
  const [nouvelleCle, setNouvelleCle] = useState('')
  const [renewalMsg, setRenewalMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pool' | 'assigned'>('all')

  const [form, setForm] = useState({
    ecole_id: '', type: 'standard',
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
  })

  const up = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }))

  const fetchData = async () => {
    setLoading(true)
    const [lRes, eRes] = await Promise.all([
      fetch('/api/super-admin/licences'),
      fetch('/api/super-admin/stats'),
    ])
    const lData = lRes.ok ? await lRes.json().catch(() => ({})) : {}
    const eData = eRes.ok ? await eRes.json().catch(() => ({})) : {}
    setLicences(lData.licences || [])
    setStats(lData.stats || { pool: 0, actives: 0 })
    setEcoles(eData.ecoles || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openForm = (m: Mode) => {
    setMode(m)
    setNouvelleCle('')
    setRenewalMsg('')
    setShowForm(true)
  }

  const handleCreate = async () => {
    if (mode === 'renewal' && !form.ecole_id) return
    setSaving(true)
    const res = await fetch('/api/super-admin/licences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, mode }),
    })
    const data = await res.json()
    if (data.cle_licence) setNouvelleCle(data.cle_licence)
    if (data.extended) setRenewalMsg('Licence prolongée avec succès')
    setShowForm(false)
    await fetchData()
    setSaving(false)
  }

  const handleToggle = async (licence: Licence) => {
    await fetch('/api/super-admin/licences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: licence.id, is_active: !licence.is_active, date_fin: licence.date_fin }),
    })
    await fetchData()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const licenceStatus = (l: Licence) => {
    if (!l.is_active) return { label: 'Inactive', color: 'bg-slate-100 text-slate-600' }
    const days = Math.floor((new Date(l.date_fin).getTime() - Date.now()) / 86400000)
    if (days < 0) return { label: 'Expirée', color: 'bg-red-100 text-red-700' }
    if (days < 30) return { label: `${days}j restants`, color: 'bg-amber-100 text-amber-700' }
    return { label: 'Active', color: 'bg-emerald-100 text-emerald-700' }
  }

  const filtered = licences.filter(l => {
    if (filter === 'pool') return !l.ecole_id
    if (filter === 'assigned') return !!l.ecole_id
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Licences</h1>
          <p className="text-slate-500 text-sm mt-1">
            {stats.pool} clé(s) d&apos;activation disponible(s) · {stats.actives} licence(s) active(s)
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openForm('activation')}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm">
            <KeyRound className="w-4 h-4" /> Clé d&apos;activation
          </button>
          <button onClick={() => openForm('renewal')}
            className="flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm">
            <RefreshCw className="w-4 h-4" /> Renouveler
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800">
        <p className="font-semibold mb-1">Flux offline</p>
        <p className="text-blue-700">
          Générez une <strong>clé d&apos;activation</strong> (sans école) et remettez-la au directeur sur clé USB ou papier.
          Lors de l&apos;inscription sur <code className="bg-blue-100 px-1 rounded">/register</code>, la clé active son école localement.
          Pour une école déjà inscrite, utilisez <strong>Renouveler</strong>.
        </p>
      </div>

      {nouvelleCle && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-800 mb-1">Clé d&apos;activation générée — à remettre au directeur</p>
            <p className="font-mono text-lg text-emerald-700">{nouvelleCle}</p>
          </div>
          <button onClick={() => copyToClipboard(nouvelleCle)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            {copied ? <><Check className="w-4 h-4" /> Copié</> : <><Copy className="w-4 h-4" /> Copier</>}
          </button>
        </div>
      )}

      {renewalMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 text-emerald-800 text-sm font-medium">
          {renewalMsg}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-slate-800 text-lg">
                {mode === 'activation' ? 'Clé d\'activation (nouvelle école)' : 'Renouvellement de licence'}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              {mode === 'renewal' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">École *</label>
                  <select value={form.ecole_id} onChange={e => up('ecole_id', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                    <option value="">Sélectionner une école</option>
                    {ecoles.map(e => (
                      <option key={e.id} value={e.id}>{e.nom}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plan *</label>
                <select value={form.type} onChange={e => up('type', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  {Object.entries(PLAN_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Début</label>
                  <input type="date" value={form.date_debut} onChange={e => up('date_debut', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expiration</label>
                  <input type="date" value={form.date_fin} onChange={e => up('date_fin', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>
              <button onClick={handleCreate} disabled={saving || (mode === 'renewal' && !form.ecole_id)}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-lg px-4 py-3 text-sm transition-colors">
                {saving ? 'Traitement...' : mode === 'activation' ? 'Générer la clé' : 'Renouveler'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(['all', 'pool', 'assigned'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              filter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            {f === 'all' ? 'Toutes' : f === 'pool' ? 'Disponibles' : 'Attribuées'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Aucune licence</div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['École', 'Clé', 'Plan', 'Statut', 'Expiration', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(l => {
                const status = licenceStatus(l)
                return (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      {l.ecole_id ? (
                        <>
                          <p className="font-semibold text-slate-800 text-sm">{l.ecole_nom}</p>
                          <p className="text-xs text-slate-400 font-mono">{l.ecole_slug}</p>
                        </>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-violet-100 text-violet-700">
                          En attente d&apos;activation
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-600">{l.cle_licence}</span>
                        <button onClick={() => copyToClipboard(l.cle_licence)} className="text-slate-300 hover:text-slate-600">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">{l.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{l.date_fin}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggle(l)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          l.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}>
                        {l.is_active ? 'Révoquer' : 'Activer'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}