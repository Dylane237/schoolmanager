'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

type ClasseData = { classe: string; effectif: number; payes: number; pct: number }

function barColor(pct: number) {
  if (pct >= 80) return '#10b981'
  if (pct >= 50) return '#f59e0b'
  return '#f87171'
}

export default function ClassesPaiementChart({ data, slug }: { data: ClasseData[]; slug: string }) {
  const t = useTranslations('components.classesPaiementChart')
  const shown = data.slice(0, 8)
  const chartHeight = Math.max(shown.length * 32, 120)
  const otherCount = data.length - 8

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{t('distribution')}</p>
          <p className="text-lg font-semibold text-slate-800">{t('title')}</p>
        </div>
        <Link href={`/${slug}/classes`} className="text-xs text-emerald-600 hover:underline font-medium flex-shrink-0">
          {t('viewAll')}
        </Link>
      </div>

      {shown.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-slate-400">{t('noInstalments')}</p>
        </div>
      ) : (
        <div style={{ height: chartHeight }} className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={shown}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              barCategoryGap={8}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="classe"
                width={72}
                tick={{ fontSize: 11, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                formatter={(value, _name, item) => {
                  const p = item.payload as ClasseData
                  const v = Number(value ?? 0)
                  return [
                    t('studentsCount', { paid: p.payes, total: p.effectif, pct: v }),
                    t('tooltipUpToDate'),
                  ]
                }}
              />
              <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={16}>
                {shown.map((d, i) => (
                  <Cell key={i} fill={barColor(d.pct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {otherCount > 0 && (
        <p className="text-xs text-slate-400 mt-3">
          {t('otherClasses', { count: otherCount })}
        </p>
      )}
    </div>
  )
}
