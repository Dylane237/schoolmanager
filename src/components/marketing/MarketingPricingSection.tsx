'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { LICENCE_PLANS, PLAN_PRICES, type LicencePlan } from '@/lib/licence-constants'

export function MarketingPricingSection() {
  const t = useTranslations('marketing.pricing')
  const [focused, setFocused] = useState<LicencePlan>('standard')

  return (
    <section id="pricing" className="mk-section scroll-mt-[4.5rem] lg:scroll-mt-20">
      <div className="mk-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mk-eyebrow">{t('eyebrow')}</p>
          <h2 className="mk-h2 mt-2">{t('title')}</h2>
          <p className="mk-subtitle">{t('subtitle')}</p>
          <p className="mk-pricing-note">{t('annualNote')}</p>
        </div>

        <div className="mt-8 grid gap-5 sm:mt-10 lg:mt-12 lg:grid-cols-3 lg:gap-6">
          {LICENCE_PLANS.map(plan => {
            const price = PLAN_PRICES[plan]
            const priceFmt = price.toLocaleString('fr-FR')
            const monthlyFmt = Math.round(price / 12).toLocaleString('fr-FR')
            const features = t.raw(`plans.${plan}.features`) as string[]
            const isStandard = plan === 'standard'
            const isFocused = focused === plan

            return (
              <article
                key={plan}
                className={`mk-pricing-card ${isStandard ? 'mk-pricing-card-featured' : ''} ${isFocused ? 'mk-pricing-card-focused' : ''}`}
                onMouseEnter={() => setFocused(plan)}
                onFocus={() => setFocused(plan)}
                tabIndex={0}
              >
                {isStandard && (
                  <span className="mk-pricing-badge">{t('plans.standard.badge')}</span>
                )}

                <p className="mk-pricing-tagline">{t(`plans.${plan}.tagline`)}</p>
                <h3 className="mt-1 text-xl font-bold" style={{ color: 'var(--mk-fg)' }}>
                  {t(`plans.${plan}.name`)}
                </h3>
                <p className="mk-text-muted mt-1 text-sm">{t(`plans.${plan}.students`)}</p>

                <div className="mt-5">
                  <p className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: 'var(--mk-fg)' }}>
                      {priceFmt}
                    </span>
                    <span className="mk-text-faint text-sm">
                      {t('currency')}{t('perYear')}
                    </span>
                  </p>
                  <p className="mk-text-faint mt-1 text-xs">
                    {t('monthlyHint', { amount: monthlyFmt })}
                  </p>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {features.map(f => (
                    <li key={f} className="flex gap-2.5 text-sm leading-snug" style={{ color: 'var(--mk-fg-secondary)' }}>
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`mt-6 block rounded-lg py-3 text-center text-sm font-semibold transition sm:mt-8 ${
                    isStandard || isFocused ? 'mk-btn-primary w-full' : 'mk-btn-secondary w-full'
                  }`}
                >
                  {t('cta')}
                </Link>
              </article>
            )
          })}
        </div>

        <p className="mk-text-muted mt-8 text-center text-sm sm:mt-10">
          {t('contact')}{' '}
          <Link href="/contact" className="mk-link">{t('contactCta')}</Link>
          {' · '}
          <Link href="/tarifs" className="mk-link">{t('seeDetails')}</Link>
        </p>
      </div>
    </section>
  )
}
