'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Banknote, School, Users } from 'lucide-react'

const SCREEN_WIDTH = 2048
const SCREEN_HEIGHT = 1148

const TABS = [
  { key: 'classes', icon: School, src: '/marketing/classes.png', height: 1148 },
  { key: 'payments', icon: Banknote, src: '/marketing/paiements.png', height: 1148 },
  { key: 'students', icon: Users, src: '/marketing/eleves.png', height: 1150 },
] as const

type TabKey = (typeof TABS)[number]['key']

export function MarketingAppShowcase({ priority = false }: { priority?: boolean }) {
  const t = useTranslations('marketing.showcase')
  const [active, setActive] = useState<TabKey>('classes')
  const activeTab = TABS.find(tab => tab.key === active)!

  const onTabChange = useCallback((key: TabKey) => {
    setActive(key)
  }, [])

  return (
    <div className="mk-showcase">
      <div className="mk-filter-row" role="tablist" aria-label={t('ariaTabs')}>
        {TABS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            className={`mk-filter-btn ${active === key ? 'is-active' : ''}`}
            onClick={() => onTabChange(key)}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            {t(`tabsShort.${key}`)}
          </button>
        ))}
      </div>

      <div
        className="mk-showcase-frame"
        style={{ aspectRatio: `${SCREEN_WIDTH} / ${activeTab.height}` }}
      >
        {TABS.map(({ key, src, height }) => (
          <div
            key={key}
            className={`mk-showcase-slide ${active === key ? 'is-active' : ''}`}
            aria-hidden={active !== key}
          >
            <Image
              src={src}
              alt={t(`captions.${key}`)}
              width={SCREEN_WIDTH}
              height={height}
              priority={priority && key === 'classes'}
              unoptimized
              className="mk-showcase-img"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1152px"
            />
          </div>
        ))}
      </div>

      <p className="mk-showcase-caption">{t(`captions.${active}`)}</p>
    </div>
  )
}
