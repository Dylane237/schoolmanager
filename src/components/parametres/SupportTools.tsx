'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { LifeBuoy, Download, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SupportTools() {
  const t = useTranslations('parametres.supportTools')
  const [loading, setLoading] = useState<'diag' | 'audit' | null>(null)

  const download = async (type: 'diag' | 'audit') => {
    setLoading(type)
    try {
      const url = type === 'diag'
        ? '/api/support/diagnostic'
        : '/api/support/audit-export?format=csv&limit=500'
      const res = await fetch(url)
      if (!res.ok) {
        toast.error(t('toasts.exportFailed'))
        return
      }
      const blob = type === 'diag'
        ? new Blob([JSON.stringify(await res.json(), null, 2)], { type: 'application/json' })
        : await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = type === 'diag'
        ? `schoolmanager-diagnostic-${Date.now()}.json`
        : `schoolmanager-audit-${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
      toast.success(t('toasts.exported'))
    } catch {
      toast.error(t('toasts.networkError'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <LifeBuoy className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-slate-800">{t('title')}</h3>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed">{t('description')}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => download('diag')}
          disabled={loading !== null}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {loading === 'diag' ? t('exporting') : t('diagnostic')}
        </button>
        <button
          type="button"
          onClick={() => download('audit')}
          disabled={loading !== null}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <FileText className="w-4 h-4" />
          {loading === 'audit' ? t('exporting') : t('auditCsv')}
        </button>
      </div>
    </div>
  )
}
