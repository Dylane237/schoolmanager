'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'

const GROUPS = [
  { key: 'overview', items: ['dashboard'] },
  { key: 'schooling', items: ['students', 'classes', 'attendance', 'nursery', 'transfers'] },
  { key: 'finance', items: ['installments', 'collections', 'unpaid'] },
  { key: 'pedagogy', items: ['grades', 'bulletins'] },
  { key: 'admin', items: ['staff', 'announcements', 'backup', 'access'] },
  { key: 'secretariat', items: ['noInternet', 'leadership'] },
] as const

type GroupKey = (typeof GROUPS)[number]['key']

export function MarketingFeatureGrid() {
  const t = useTranslations('marketing.features')
  const [openGroup, setOpenGroup] = useState<GroupKey | null>('schooling')

  return (
    <section id="features" className="mk-section mk-band scroll-mt-[4.5rem] lg:scroll-mt-20">
      <div className="mk-container">
        <div className="max-w-2xl">
          <h2 className="mk-h2">{t('title')}</h2>
          <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--mk-muted)' }}>
            {t('subtitle')}
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {GROUPS.map(({ key, items }) => {
            const isOpen = openGroup === key

            return (
              <article
                key={key}
                className={`mk-feature-group mk-feature-group-interactive ${isOpen ? 'mk-feature-group-open' : ''}`}
              >
                <button
                  type="button"
                  className="mk-feature-group-header"
                  aria-expanded={isOpen}
                  onClick={() => setOpenGroup(prev => (prev === key ? null : key))}
                >
                  <h3 className="mk-feature-group-label !mb-0">{t(`groups.${key}.label`)}</h3>
                  <span className="mk-feature-group-count">{items.length}</span>
                  <ChevronDown className={`mk-feature-chevron h-4 w-4 lg:hidden ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                <ul className={`mk-feature-list ${isOpen ? 'mk-feature-list-open' : ''}`}>
                  {items.map(itemKey => (
                    <li key={itemKey} className="mk-feature-item">
                      <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--mk-fg)' }}>
                        {t(`groups.${key}.items.${itemKey}.title`)}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed" style={{ color: 'var(--mk-muted)' }}>
                        {t(`groups.${key}.items.${itemKey}.desc`)}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
