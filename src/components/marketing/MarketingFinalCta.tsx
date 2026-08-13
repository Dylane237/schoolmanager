import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowRight, Download } from 'lucide-react'
import { getDesktopDownloadUrl } from '@/lib/desktop-download'

export async function MarketingFinalCta() {
  const t = await getTranslations('marketing.ctaBand')
  const downloadUrl = getDesktopDownloadUrl()

  return (
    <section className="mk-section border-t" style={{ borderColor: 'var(--mk-border)' }}>
      <div className="mk-container-narrow">
        <h2 className="mk-h2 text-center">{t('title')}</h2>
        <p className="mt-3 text-center text-base" style={{ color: 'var(--mk-muted)' }}>
          {t('subtitle')}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:items-center">
          <Link href="/register" className="mk-btn-primary w-full sm:w-auto">
            {t('register')}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a href={downloadUrl} className="mk-btn-secondary w-full sm:w-auto">
            <Download className="h-4 w-4" />
            {t('download')}
          </a>
        </div>
      </div>
    </section>
  )
}
