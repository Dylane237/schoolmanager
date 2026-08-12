'use client'

import { useTranslations } from 'next-intl'

const QUOTE_KEYS = ['1', '2', '3', '4', '5', '6'] as const

export function MarketingTestimonials() {
  const t = useTranslations('marketing.testimonials')

  const quotes = QUOTE_KEYS.map(key => ({
    key,
    text: t(`items.${key}.text`),
    author: t(`items.${key}.author`),
    role: t(`items.${key}.role`),
  }))

  const doubled = [...quotes, ...quotes]

  return (
    <section className="mk-section overflow-hidden">
      <div className="mk-container">
        <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-12">
          <h2 className="mk-h2">{t('title')}</h2>
          <p className="mk-subtitle">{t('subtitle')}</p>
        </div>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 sm:w-16 mk-marquee-fade-left" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 sm:w-16 mk-marquee-fade-right" />

        <div className="marketing-marquee-track px-4">
          {doubled.map((q, i) => (
            <figure key={`${q.key}-${i}`} className="mk-testimonial-card">
              <blockquote className="text-sm leading-relaxed" style={{ color: 'var(--mk-fg-secondary)' }}>
                &ldquo;{q.text}&rdquo;
              </blockquote>
              <figcaption
                className="mt-4 border-t pt-4"
                style={{ borderColor: 'var(--mk-border)' }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--mk-fg)' }}>
                  {q.author}
                </p>
                <p className="mk-text-faint text-xs">{q.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
