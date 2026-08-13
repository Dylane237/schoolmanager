import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowRight, Download } from 'lucide-react'
import { MarketingAppShowcase } from '@/components/marketing/MarketingAppShowcase'
import { getDesktopDownloadUrl } from '@/lib/desktop-download'

export async function MarketingHero() {
  const t = await getTranslations('marketing.hero')
  const downloadUrl = getDesktopDownloadUrl()

  return (
    <section className="mk-section mk-hero pt-6 pb-8 sm:pt-12 sm:pb-14 lg:pt-14 lg:pb-16">
      <div className="mk-container grid items-center gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-12 xl:gap-14">
        <div className="max-w-lg lg:max-w-none">
          <p className="mk-hero-kicker">{t('kicker')}</p>
          <h1 className="mk-hero-title mt-3">{t('title')}</h1>
          <p className="mt-4 text-base leading-relaxed sm:text-lg" style={{ color: 'var(--mk-muted)' }}>
            {t('subtitle')}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/register" className="mk-btn-primary w-full sm:w-auto">
              {t('ctaRegister')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href={downloadUrl} className="mk-btn-secondary w-full sm:w-auto">
              <Download className="h-4 w-4" />
              <span className="truncate">{t('ctaDownload')}</span>
            </a>
          </div>

          <p className="mk-hero-note mt-6">{t('editorNote')}</p>
        </div>

        <div className="min-w-0 w-full lg:justify-self-end">
          <MarketingAppShowcase priority />
        </div>
      </div>
    </section>
  )
}
