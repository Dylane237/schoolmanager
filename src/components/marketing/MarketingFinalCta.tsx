import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getDesktopDownloadUrl } from '@/lib/desktop-download'
import { MarketingFadeIn } from '@/components/marketing/MarketingFadeIn'

export async function MarketingFinalCta() {
  const t = await getTranslations('marketing.ctaBand')
  const downloadUrl = getDesktopDownloadUrl()

  return (
    <section className="mk-section mk-section-cta">
      <div className="mk-container mk-cta-inner">
        <MarketingFadeIn>
          <h2 className="mk-display-title mk-display-title-sm">{t('title')}</h2>
          <p className="mk-section-lead mx-auto max-w-lg text-center">{t('subtitle')}</p>
          <div className="mk-hero-actions mt-8 justify-center">
            <Link href="/register" className="mk-btn-primary">
              {t('register')}
            </Link>
            <a href={downloadUrl} className="mk-btn-outline">
              {t('download')}
            </a>
          </div>
        </MarketingFadeIn>
      </div>
    </section>
  )
}
