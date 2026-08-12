'use client'

import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ScrollText, Filter } from 'lucide-react'
import { getIntlLocale, type Locale } from '@/i18n/config'

type AuditRow = {
  id: string
  action: string
  action_label: string
  module: string
  module_label: string
  entity_id: string | null
  user_email: string | null
  details: Record<string, unknown> | null
  created_at: string
}

const MODULE_IDS = ['tous', 'paiements', 'notes', 'users'] as const

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
}

export default function AuditLogPanel() {
  const t = useTranslations('parametres.auditLog')
  const tc = useTranslations('common')
  const locale = useLocale() as Locale
  const intlLocale = getIntlLocale(locale)
  const [logs, setLogs] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [module, setModule] = useState('tous')

  useEffect(() => {
    let cancelled = false
    const q = module !== 'tous' ? `?module=${module}&limit=50` : '?limit=50'
    fetch(`/api/audit/logs${q}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!cancelled && data) setLogs(data.logs ?? [])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [module])

  const selectModule = (id: string) => {
    if (id === module) return
    setLoading(true)
    setModule(id)
  }

  const formatWhen = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(intlLocale, {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  const detailSummary = (details: Record<string, unknown> | null): string => {
    if (!details) return ''
    const parts: string[] = []
    if (details.montant != null) parts.push(`${Number(details.montant).toLocaleString(intlLocale)} ${tc('currency').charAt(0)}`)
    if (details.tranche != null) parts.push(t('detailInstalment', { n: String(details.tranche) }))
    if (details.note != null) parts.push(t('detailGrade', { n: String(details.note) }))
    if (details.email) parts.push(String(details.email))
    if (details.role) parts.push(String(details.role))
    return parts.join(' · ')
  }

  return (
    <section className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-slate-500" />
          <div>
            <h2 className="font-semibold text-slate-800">{t('title')}</h2>
            <p className="text-xs text-slate-500">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          {MODULE_IDS.map(id => (
            <button
              key={id}
              type="button"
              onClick={() => selectModule(id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                module === id
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              {t(`modules.${id === 'tous' ? 'all' : id}`)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="p-8 text-center text-sm text-slate-400">{t('loading')}</p>
      ) : logs.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-400">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-semibold">{t('columns.date')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('columns.module')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('columns.action')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('columns.detail')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(row => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap tabular-nums">
                    {formatWhen(row.created_at)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.module_label}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[row.action] ?? 'bg-slate-100 text-slate-600'}`}>
                      {row.action_label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {detailSummary(row.details) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
