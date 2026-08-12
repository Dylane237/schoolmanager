import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { ArrowRight, Download } from 'lucide-react'
import { MarketingScreenshot } from '@/components/marketing/MarketingScreenshot'
import { getDesktopDownloadUrl } from '@/lib/desktop-download'

export async function MarketingHero() {
  const t = await getTranslations('marketing.hero')
  const downloadUrl = getDesktopDownloadUrl()

  return (
    <section className="relative overflow-hidden pt-6 pb-12 sm:pt-10 sm:pb-16 lg:pt-14 lg:pb-24">
      <div className="marketing-glow absolute inset-0" aria-hidden />
      <div className="marketing-grid-bg absolute inset-0 opacity-60 sm:opacity-40" aria-hidden />

      <div className="mk-container relative grid items-center gap-10 lg:grid-cols-2 lg:gap-14 xl:gap-16">
        <div className="max-w-xl lg:max-w-none">
          <div className="mb-4 flex flex-wrap gap-2 sm:mb-6">
            {(['desktop', 'web', 'mobile'] as const).map(key => (
              <span key={key} className="mk-pill">
                {t(`pills.${key}`)}
              </span>
            ))}
          </div>

          <h1
            className="text-[1.75rem] font-bold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl xl:text-[3.25rem]"
            style={{ color: 'var(--mk-fg)' }}
          >
            {t('title1')}
            <span className="mt-1 block bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent sm:mt-2">
              {t('title2')}
            </span>
            <span className="mt-1 hidden text-[0.92em] sm:block" style={{ color: 'var(--mk-fg-secondary)' }}>
              {t('title3')}
            </span>
          </h1>

          <p className="mk-subtitle mt-4 max-w-lg sm:mt-6">{t('subtitle')}</p>

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-stretch">
            <Link href="/register" className="mk-btn-primary w-full sm:w-auto">
              {t('ctaRegister')}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href={downloadUrl} className="mk-btn-secondary w-full sm:w-auto">
              <Download className="h-4 w-4" />
              <span className="truncate">{t('ctaDownload')}</span>
            </a>
          </div>

          <p className="mk-text-faint mt-4 text-xs leading-relaxed sm:mt-6 sm:text-sm">{t('trust')}</p>
        </div>

        <div className="mk-hero-preview-wrap lg:pl-4">
          <div className="relative">
            <div
              className="absolute -inset-3 rounded-3xl blur-3xl sm:-inset-4"
              style={{ background: 'var(--mk-accent-soft)' }}
              aria-hidden
            />
            <div className="mk-hero-preview-scale relative">
              <div className="mb-2 flex items-center gap-2 pl-0.5 sm:mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-medium text-emerald-500">{t('liveDemo')}</span>
              </div>
              <MarketingScreenshot
                src="/marketing/paiements.png"
                alt={t('screenshotAlt')}
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
