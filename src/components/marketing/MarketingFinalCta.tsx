import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowRight, Download } from 'lucide-react'
import { getDesktopDownloadUrl } from '@/lib/desktop-download'

export async function MarketingFinalCta() {
  const t = await getTranslations('marketing.ctaBand')
  const downloadUrl = getDesktopDownloadUrl()

  return (
    <section className="mk-section mk-cta-band">
      <div className="mk-cta-band-bg absolute inset-0" aria-hidden />
      <div className="marketing-glow absolute inset-0" aria-hidden />

      <div className="mk-container-narrow relative text-center">
        <h2 className="mk-h2">{t('title')}</h2>
        <p className="mk-subtitle" style={{ color: 'var(--mk-fg-secondary)' }}>
          {t('subtitle')}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center">
          <Link
            href="/register"
            className="mk-btn-primary mk-btn-inverse w-full sm:w-auto"
          >
            {t('register')}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={downloadUrl}
            className="mk-btn-secondary mk-btn-outline w-full sm:w-auto"
          >
            <Download className="h-4 w-4" />
            {t('download')}
          </a>
        </div>
      </div>
    </section>
  )
}
