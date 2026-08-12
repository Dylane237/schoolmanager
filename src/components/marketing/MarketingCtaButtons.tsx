import Link from 'next/link'
import { Download } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getDesktopDownloadUrl } from '@/lib/desktop-download'

type Props = {
  variant?: 'primary' | 'secondary'
  showDownload?: boolean
}

export async function MarketingCtaButtons({ variant = 'primary', showDownload = true }: Props) {
  const t = await getTranslations('marketing.hero')
  const downloadUrl = getDesktopDownloadUrl()

  if (variant === 'secondary') {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/register" className="btn-primary text-center">{t('ctaRegister')}</Link>
        {showDownload && (
          <a href={downloadUrl} className="btn-secondary flex items-center justify-center gap-2">
            <Download className="h-4 w-4" />
            {t('ctaDownload')}
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link href="/register" className="btn-primary text-center shadow-lg shadow-emerald-500/20">
        {t('ctaRegister')}
      </Link>
      {showDownload && (
        <a
          href={downloadUrl}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          <Download className="h-4 w-4 text-emerald-600" />
          {t('ctaDownload')}
        </a>
      )}
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-base font-medium text-slate-600 hover:text-slate-900"
      >
        {t('ctaLogin')}
      </Link>
    </div>
  )
}
