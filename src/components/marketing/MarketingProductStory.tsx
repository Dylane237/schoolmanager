import { getTranslations } from 'next-intl/server'

const STEPS = ['1', '2', '3'] as const

export async function MarketingProductStory() {
  const t = await getTranslations('marketing.productStory')

  return (
    <section className="mk-section">
      <div className="mk-container mk-container-narrow text-center">
        <p className="mk-eyebrow">{t('eyebrow')}</p>
        <h2 className="mk-h2 mt-2">{t('title')}</h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed" style={{ color: 'var(--mk-muted)' }}>
          {t('intro')}
        </p>

        <ol className="mk-steps mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5 sm:text-left">
          {STEPS.map(n => (
            <li key={n} className="mk-step-card">
              <span className="mk-step-num">{n}</span>
              <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--mk-fg)' }}>
                {t(`steps.${n}.title`)}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--mk-muted)' }}>
                {t(`steps.${n}.desc`)}
              </p>
            </li>
          ))}
        </ol>

        <p className="mx-auto mt-8 max-w-lg text-sm leading-relaxed" style={{ color: 'var(--mk-fg-secondary)' }}>
          {t('footnote')}
        </p>
      </div>
    </section>
  )
}
