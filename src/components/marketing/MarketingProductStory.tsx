import { getTranslations } from 'next-intl/server'
import { MarketingFadeIn } from '@/components/marketing/MarketingFadeIn'

const STEPS = ['1', '2', '3'] as const

export async function MarketingProductStory() {
  const t = await getTranslations('marketing.productStory')

  return (
    <section className="mk-section mk-section-alt">
      <div className="mk-container">
        <MarketingFadeIn>
          <p className="mk-section-eye">{t('eyebrow')}</p>
          <h2 className="mk-display-title mk-display-title-sm">{t('title')}</h2>
          <p className="mk-section-lead">{t('intro')}</p>
        </MarketingFadeIn>

        <ol className="mk-service-list mt-8 md:mt-10">
          {STEPS.map(n => (
            <li key={n} className="mk-service-item">
              <div>
                <p className="mk-service-name">
                  <span className="mk-step-index">{n}</span>
                  {t(`steps.${n}.title`)}
                </p>
                <p className="mk-service-desc">{t(`steps.${n}.desc`)}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mk-section-footnote mt-8">{t('footnote')}</p>
      </div>
    </section>
  )
}
