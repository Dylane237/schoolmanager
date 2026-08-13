import { getTranslations } from 'next-intl/server'
import { MarketingAppShowcase } from '@/components/marketing/MarketingAppShowcase'
import { MarketingFadeIn } from '@/components/marketing/MarketingFadeIn'

export async function MarketingPreviewSection() {
  const t = await getTranslations('marketing.showcase')

  return (
    <section id="preview" className="mk-section mk-section-alt scroll-mt-[var(--mk-nav-h)]">
      <div className="mk-container">
        <MarketingFadeIn>
          <p className="mk-section-eye">{t('sectionEye')}</p>
          <h2 className="mk-display-title mk-display-title-sm">{t('sectionTitle')}</h2>
        </MarketingFadeIn>
      </div>
      <div className="mk-container mt-8 md:mt-10">
        <MarketingAppShowcase priority />
      </div>
    </section>
  )
}
