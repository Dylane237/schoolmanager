import { getTranslations } from 'next-intl/server'

const STEPS = ['1', '2', '3', '4'] as const

export async function MarketingHowItWorks() {
  const t = await getTranslations('marketing.howItWorks')

  return (
    <section className="mk-section mk-band">
      <div className="mk-container">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mk-h2">{t('title')}</h2>
          <p className="mk-subtitle">{t('subtitle')}</p>
        </div>

        <div className="mt-8 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5 lg:mt-14 lg:grid-cols-4 lg:gap-6">
          {STEPS.map(n => (
            <article key={n} className="mk-card p-5 sm:p-6">
              <span className="text-3xl font-bold text-emerald-500/25 sm:text-4xl">{n}</span>
              <h3 className="mt-3 text-base font-semibold sm:mt-4 sm:text-lg" style={{ color: 'var(--mk-fg)' }}>
                {t(`steps.${n}.title`)}
              </h3>
              <p className="mk-text-muted mt-2 text-sm leading-relaxed">
                {t(`steps.${n}.desc`)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
