'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Download, Monitor, ExternalLink, CheckCircle2 } from 'lucide-react'
import { APP_VERSION, getDesktopDownloadUrl } from '@/lib/desktop-download'

export default function DesktopAppPanel() {
  const t = useTranslations('marketing.desktopApp')
  const [isElectron, setIsElectron] = useState(false)
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    const api = window.electronAPI
    if (!api?.getAppVersion) return
    api.getAppVersion().then(v => {
      setIsElectron(true)
      setVersion(v)
    }).catch(() => {})
  }, [])

  const downloadUrl = getDesktopDownloadUrl()

  return (
    <section className="card overflow-hidden xl:col-span-12">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Monitor className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">{t('title')}</h2>
          <p className="text-xs text-slate-400">{t('subtitle')}</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {isElectron ? (
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">{t('installed')}</p>
              <p className="text-xs text-emerald-700 mt-1">
                {t('installedHint', { version: version ?? APP_VERSION })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-slate-800">{t('webOnly')}</p>
              <p className="text-xs text-slate-500 mt-1">{t('webOnlyHint')}</p>
              <p className="text-xs text-slate-400 mt-2">{t('version', { version: APP_VERSION })}</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <a href={downloadUrl} className="btn-primary flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t('download')}
              </a>
              <Link href="/telecharger" className="btn-secondary flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                {t('downloadPage')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
