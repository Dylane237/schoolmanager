'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { getIntlLocale, type Locale } from '@/i18n/config'

type Point = { label: string; total: number }
type Period = 'jour' | 'semaine' | 'mois' | 'custom'

const PERIODS: Period[] = ['jour', 'semaine', 'mois', 'custom']

export default function EncaissementsChart({ slug }: { slug: string }) {
  const t = useTranslations('components.encaissementsChart')
  const tc = useTranslations('common')
  const locale = useLocale() as Locale
  const intlLocale = getIntlLocale(locale)
  const [period, setPeriod] = useState<Period>('mois')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<Point[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (p: Period, f?: string, tVal?: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ period: p })
      if (p === 'custom' && f && tVal) { params.set('from', f); params.set('to', tVal) }
      const res = await fetch(`/api/dashboard/encaissements?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || tc('errorLoad'))
      setData(json.data ?? [])
    } catch {
      setError(t('loadError'))
    } finally {
      setLoading(false)
    }
  }, [t, tc])

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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{t('title')}</p>
          <p className="text-lg font-semibold text-slate-800">
            {total.toLocaleString(intlLocale)} <span className="text-sm font-normal text-slate-400">{tc('currency')}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                period === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t(`periods.${p}`)}
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
          <span className="text-xs text-slate-400">{t('to')}</span>
          <input
            type="date" value={to} onChange={e => setTo(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600"
          />
          <button
            onClick={handleCustomApply}
            disabled={!from || !to}
            className="text-xs font-medium bg-emerald-600 text-white rounded-lg px-3 py-1.5 hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {tc('apply')}
          </button>
        </div>
      )}

      <div className="h-52" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 150ms' }}>
        {error ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">{error}</div>
        ) : data.length === 0 && !loading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            {t('noPeriodData')}
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
                formatter={(value) => [`${Number(value ?? 0).toLocaleString(intlLocale)} ${tc('currency')}`, t('amount')]}
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
