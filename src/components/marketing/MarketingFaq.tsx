import { getTranslations } from 'next-intl/server'

const FAQ_KEYS = ['offline', 'data', 'install', 'migrate', 'sections', 'support'] as const

export async function MarketingFaq() {
  const t = await getTranslations('marketing.faq')

  return (
    <section className="mk-section">
      <div className="mk-container-narrow">
        <h2 className="mk-h2 text-center">{t('title')}</h2>
        <dl className="mt-8 space-y-3 sm:mt-12 sm:space-y-4">
          {FAQ_KEYS.map(key => (
            <div key={key} className="mk-card px-4 py-4 sm:px-6 sm:py-5">
              <dt className="text-sm font-semibold sm:text-base" style={{ color: 'var(--mk-fg)' }}>
                {t(`items.${key}.q`)}
              </dt>
              <dd className="mk-text-muted mt-2 text-sm leading-relaxed">
                {t(`items.${key}.a`)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
