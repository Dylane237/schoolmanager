'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Banknote, School, Users } from 'lucide-react'

const SCREEN_WIDTH = 1024
const SCREEN_HEIGHT = 574

const TABS = [
  { key: 'classes', icon: School, src: '/marketing/classes.png' },
  { key: 'payments', icon: Banknote, src: '/marketing/paiements.png' },
  { key: 'students', icon: Users, src: '/marketing/eleves.png' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function MarketingAppShowcase({ priority = false }: { priority?: boolean }) {
  const t = useTranslations('marketing.showcase')
  const [active, setActive] = useState<TabKey>('classes')

  const onTabChange = useCallback((key: TabKey) => {
    setActive(key)
  }, [])

  return (
    <div className="mk-showcase">
      <div className="mk-showcase-tabs" role="tablist" aria-label={t('ariaTabs')}>
        {TABS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            className={`mk-showcase-tab ${active === key ? 'mk-showcase-tab-active' : ''}`}
            onClick={() => onTabChange(key)}
          >
            <Icon className="mk-showcase-tab-icon" strokeWidth={1.75} aria-hidden />
            <span className="mk-showcase-tab-long">{t(`tabs.${key}`)}</span>
            <span className="mk-showcase-tab-short">{t(`tabsShort.${key}`)}</span>
          </button>
        ))}
      </div>

      <div className="mk-showcase-frame">
        <div
          className="mk-showcase-viewport"
          style={{ aspectRatio: `${SCREEN_WIDTH} / ${SCREEN_HEIGHT}` }}
        >
          {TABS.map(({ key, src }) => (
            <div
              key={key}
              className={`mk-showcase-slide ${active === key ? 'mk-showcase-slide-active' : ''}`}
              aria-hidden={active !== key}
            >
              <Image
                src={src}
                alt={t(`captions.${key}`)}
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
                priority={priority && key === 'classes'}
                className="mk-showcase-img"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 640px"
              />
            </div>
          ))}
        </div>
        <p className="mk-showcase-mobile-hint">{t('mobileHint')}</p>
      </div>

      <p className="mk-showcase-caption">{t(`captions.${active}`)}</p>
    </div>
  )
}
