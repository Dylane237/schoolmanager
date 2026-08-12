'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { X, Loader2, ExternalLink } from 'lucide-react'

interface RecuPrintProps {
  paiementId: string
  numero?: string
  onClose: () => void
}

function getRecuUrl(paiementId: string) {
  return `/api/paiements/recu?id=${paiementId}`
}

export default function RecuPrint({ paiementId, numero, onClose }: RecuPrintProps) {
  const t = useTranslations('components.recuPrint')
  const tc = useTranslations('common')
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpen = async () => {
    setError(null)
    setOpening(true)

    try {
      const res = await fetch(getRecuUrl(paiementId), { credentials: 'include' })

      if (!res.ok) {
        let message = t('generateError', { status: res.status })
        try {
          const data = await res.json()
          if (data?.error) message = data.error
        } catch {
          // non-JSON response
        }
        setError(message)
        setOpening(false)
        return
      }

      const html = await res.text()
      const win = window.open('', '_blank', 'width=850,height=1000')
      if (!win) {
        setError(t('popupBlocked'))
        setOpening(false)
        return
      }
      win.document.write(html)
      win.document.close()
    } catch {
      setError(t('networkError'))
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-lg text-slate-800">{t('title')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center">
          {numero && (
            <p className="font-mono text-sm text-slate-400 mb-2">{t('receiptNumber', { numero })}</p>
          )}
          <p className="text-sm text-slate-500 mb-1">{t('description')}</p>
          {error && (
            <p className="text-sm text-red-600 mt-3">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-lg py-3 text-base hover:bg-slate-50 transition-colors">
            {tc('close')}
          </button>
          <button onClick={handleOpen} disabled={opening}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg py-3 text-base transition-colors disabled:opacity-50">
            {opening
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ExternalLink className="w-4 h-4" />
            }
            {t('openReceipt')}
          </button>
        </div>
      </div>
    </div>
  )
}
