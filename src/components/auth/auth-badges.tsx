'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { WifiOff, Receipt, ShieldCheck, ChevronDown, type LucideIcon } from 'lucide-react'

type BadgeId = 'offline' | 'receipts' | 'local'

type AuthBadgesProps = {
  className?: string
  variant?: 'dark' | 'light'
  layout?: 'row' | 'stack'
}

const BADGE_IDS: BadgeId[] = ['offline', 'receipts', 'local']

const BADGE_ICONS: Record<BadgeId, LucideIcon> = {
  offline: WifiOff,
  receipts: Receipt,
  local: ShieldCheck,
}

export function AuthBadges({
  className = '',
  variant = 'dark',
  layout = 'row',
}: AuthBadgesProps) {
  const t = useTranslations('auth.marketing.badges')
  const [activeId, setActiveId] = useState<string | null>(null)
  const isDark = variant === 'dark'

  return (
    <div
      className={`${
        layout === 'stack'
          ? 'flex flex-col gap-3'
          : 'grid grid-cols-1 items-start gap-3 md:grid-cols-3'
      } ${className}`}
    >
      {BADGE_IDS.map(id => {
        const Icon = BADGE_ICONS[id]
        const isOpen = activeId === id

        return (
          <div
            key={id}
            onMouseEnter={() => setActiveId(id)}
            onMouseLeave={() => setActiveId(null)}
          >
            <button
              type="button"
              onClick={() => setActiveId(isOpen ? null : id)}
              className={`flex w-full flex-col overflow-hidden rounded-2xl border text-left transition-all duration-300 ${
                isDark
                  ? 'border-white/[0.08] bg-white/[0.03] hover:border-emerald-500/30 hover:bg-emerald-500/[0.06]'
                  : 'border-gray-200 bg-white shadow-sm hover:border-emerald-300 hover:shadow-md'
              } ${isOpen ? (isDark ? 'border-emerald-500/40 bg-emerald-500/[0.08] shadow-[0_12px_40px_rgba(16,185,129,0.15)]' : 'border-emerald-400 ring-2 ring-emerald-100') : ''}`}
              aria-expanded={isOpen}
            >
              <div className="flex w-full items-center gap-3 px-4 py-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors ${
                    isDark
                      ? 'bg-emerald-500/15 ring-emerald-500/30'
                      : 'bg-emerald-100 ring-emerald-200'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}
                    strokeWidth={2}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {t(`${id}.label`)}
                  </p>
                  <p className={`mt-0.5 text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                    {t(`${id}.tagline`)}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  } ${isDark ? 'text-slate-600' : 'text-gray-400'}`}
                />
              </div>

              <div
                className={`grid transition-all duration-300 ease-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className={`border-t px-4 pb-4 ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <div className={`mt-3 rounded-lg px-3 py-2.5 ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        {t('problemLabel')}
                      </p>
                      <p className={`mt-1 text-[12px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        {t(`${id}.problem`)}
                      </p>
                    </div>
                    <div className={`mt-2 rounded-lg px-3 py-2.5 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        {t('solutionLabel')}
                      </p>
                      <p className={`mt-1 text-[12px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        {t(`${id}.solution`)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}
