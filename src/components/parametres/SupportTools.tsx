'use client'

import { useState } from 'react'
import { LifeBuoy, Download, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SupportTools() {
  const [loading, setLoading] = useState<'diag' | 'audit' | null>(null)

  const download = async (type: 'diag' | 'audit') => {
    setLoading(type)
    try {
      const url = type === 'diag'
        ? '/api/support/diagnostic'
        : '/api/support/audit-export?format=csv&limit=500'
      const res = await fetch(url)
      if (!res.ok) {
        toast.error('Export impossible')
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
      toast.success('Export téléchargé')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <LifeBuoy className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-slate-800">Support & diagnostic</h3>
      </div>
      <p className="text-sm text-slate-500 leading-relaxed">
        Exportez un rapport technique (licence, version, base) ou le journal d&apos;audit
        (paiements, notes, utilisateurs) à envoyer au support.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => download('diag')}
          disabled={loading !== null}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {loading === 'diag' ? 'Export...' : 'Diagnostic licence'}
        </button>
        <button
          type="button"
          onClick={() => download('audit')}
          disabled={loading !== null}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <FileText className="w-4 h-4" />
          {loading === 'audit' ? 'Export...' : 'Journal d\'audit (CSV)'}
        </button>
      </div>
    </div>
  )
}
