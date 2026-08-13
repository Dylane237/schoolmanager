'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { MarketingFadeIn } from '@/components/marketing/MarketingFadeIn'

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
  const [active, setActive] = useState<GroupKey>('schooling')
  const group = GROUPS.find(g => g.key === active)!

  return (
    <section id="features" className="mk-section scroll-mt-[var(--mk-nav-h)]">
      <div className="mk-container">
        <MarketingFadeIn>
          <p className="mk-section-eye">{t('sectionEye')}</p>
          <h2 className="mk-display-title mk-display-title-sm">{t('sectionTitle')}</h2>
          <p className="mk-section-lead">{t('subtitle')}</p>
        </MarketingFadeIn>

        <div className="mk-filter-row mt-8 md:mt-10" role="tablist" aria-label={t('filterLabel')}>
          {GROUPS.map(({ key }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active === key}
              className={`mk-filter-btn ${active === key ? 'is-active' : ''}`}
              onClick={() => setActive(key)}
            >
              {t(`groups.${key}.label`)}
            </button>
          ))}
        </div>

        <ul className="mk-service-list mt-6 md:mt-8">
          {group.items.map(itemKey => (
            <li key={itemKey} className="mk-service-item">
              <div>
                <p className="mk-service-name">{t(`groups.${group.key}.items.${itemKey}.title`)}</p>
                <p className="mk-service-desc">{t(`groups.${group.key}.items.${itemKey}.desc`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
