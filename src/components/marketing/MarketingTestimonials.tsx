'use client'

import { useTranslations } from 'next-intl'
import { Shield, Wifi, WifiOff, Layers } from 'lucide-react'

const ITEM_KEYS = ['1', '2', '3', '4'] as const
const ICONS = [Layers, WifiOff, Shield, Wifi] as const

export function MarketingTestimonials() {
  const t = useTranslations('marketing.testimonials')

  return (
    <section className="mk-section">
      <div className="mk-container">
        <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <h2 className="mk-h2">{t('title')}</h2>
          <p className="mk-subtitle">{t('subtitle')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:gap-6">
          {ITEM_KEYS.map((key, i) => {
            const Icon = ICONS[i]
            return (
              <article key={key} className="mk-card p-5 sm:p-6 text-left">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Icon className="h-5 w-5 text-emerald-600" strokeWidth={1.75} />
                </div>
                <h3 className="text-base font-semibold" style={{ color: 'var(--mk-fg)' }}>
                  {t(`items.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--mk-fg-secondary)' }}>
                  {t(`items.${key}.desc`)}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
