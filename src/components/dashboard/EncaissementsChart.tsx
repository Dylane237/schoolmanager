'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

type Point = { label: string; total: number }
type Period = 'jour' | 'semaine' | 'mois' | 'custom'

const PERIOD_LABEL: Record<Period, string> = {
  jour: 'Jour', semaine: 'Semaine', mois: 'Mois', custom: 'Personnalisé',
}

export default function EncaissementsChart({ slug }: { slug: string }) {
  const [period, setPeriod] = useState<Period>('mois')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (p: Period, f?: string, t?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ period: p })
      if (p === 'custom' && f && t) { params.set('from', f); params.set('to', t) }
      const res = await fetch(`/api/dashboard/encaissements?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur de chargement')
      setData(json.data ?? [])
    } catch {
      // On garde les dernières données valides affichées plutôt que de
      // vider le graphique sur une erreur réseau ponctuelle.
      setError('Impossible de charger les données pour cette période.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (period !== 'custom') fetchData(period)
  }, [period, fetchData])

  const handleCustomApply = () => {
    if (from && to) fetchData('custom', from, to)
  }

  const total = data.reduce((s, d) => s + d.total, 0)

  return (
    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Encaissements</p>
          <p className="text-lg font-semibold text-slate-800">
            {total.toLocaleString('fr-FR')} <span className="text-sm font-normal text-slate-400">FCFA</span>
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {(Object.keys(PERIOD_LABEL) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                period === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <input
            type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600"
          />
          <span className="text-xs text-slate-400">à</span>
          <input
            type="date" value={to} onChange={e => setTo(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600"
          />
          <button
            onClick={handleCustomApply}
            disabled={!from || !to}
            className="text-xs font-medium bg-emerald-600 text-white rounded-lg px-3 py-1.5 hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Appliquer
          </button>
        </div>
      )}

      <div className="h-52" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 150ms' }}>
        {error ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">{error}</div>
        ) : data.length === 0 && !loading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            Aucun encaissement sur cette période
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                width={40}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString('fr-FR')} FCFA`, 'Montant']}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                labelStyle={{ color: '#1e293b', fontWeight: 600 }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#10b981', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
