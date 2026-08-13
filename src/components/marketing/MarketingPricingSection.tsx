'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { LICENCE_PLANS, PLAN_PRICES } from '@/lib/licence-constants'
import { MarketingFadeIn } from '@/components/marketing/MarketingFadeIn'

export function MarketingPricingSection() {
  const t = useTranslations('marketing.pricing')

  return (
    <section id="pricing" className="mk-section scroll-mt-[var(--mk-nav-h)]">
      <div className="mk-container">
        <MarketingFadeIn>
          <p className="mk-section-eye">{t('eyebrow')}</p>
          <h2 className="mk-display-title mk-display-title-sm">{t('title')}</h2>
          <p className="mk-section-lead">{t('subtitle')}</p>
          <p className="mk-pricing-note">{t('annualNote')}</p>
        </MarketingFadeIn>

        <div className="mk-pricing-grid mt-8 md:mt-12">
          {LICENCE_PLANS.map(plan => {
            const price = PLAN_PRICES[plan]
            const priceFmt = price.toLocaleString('fr-FR')
            const monthlyFmt = Math.round(price / 12).toLocaleString('fr-FR')
            const features = t.raw(`plans.${plan}.features`) as string[]
            const isStandard = plan === 'standard'

            return (
              <article
                key={plan}
                className={`mk-plan-card ${isStandard ? 'mk-plan-card-featured' : ''}`}
              >
                {isStandard && <span className="mk-plan-badge">{t('plans.standard.badge')}</span>}
                <p className="mk-plan-tag">{t(`plans.${plan}.tagline`)}</p>
                <h3 className="mk-plan-name">{t(`plans.${plan}.name`)}</h3>
                <p className="mk-plan-meta">{t(`plans.${plan}.students`)}</p>
                <p className="mk-plan-price">
                  {priceFmt}
                  <span>{t('currency')}{t('perYear')}</span>
                </p>
                <p className="mk-plan-monthly">{t('monthlyHint', { amount: monthlyFmt })}</p>
                <ul className="mk-plan-features">
                  {features.map(f => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={isStandard ? 'mk-btn-primary w-full' : 'mk-btn-outline w-full'}
                >
                  {t('cta')}
                </Link>
              </article>
            )
          })}
        </div>

        <p className="mk-section-footnote mt-8 text-center md:mt-10">
          {t('contact')}{' '}
          <Link href="/contact" className="mk-link">{t('contactCta')}</Link>
          {' · '}
          <Link href="/tarifs" className="mk-link">{t('seeDetails')}</Link>
        </p>
      </div>
    </section>
  )
}
