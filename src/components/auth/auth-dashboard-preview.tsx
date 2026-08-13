'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Banknote, DoorOpen, TrendingUp, Users } from 'lucide-react'

type AuthDashboardPreviewProps = {
  variant?: 'full' | 'compact'
  className?: string
}

type PreviewTab = 'overview' | 'payments' | 'students'

const TABS: PreviewTab[] = ['overview', 'payments', 'students']
const CHART_HEIGHTS = [42, 68, 55, 82, 61, 74, 48]

export function AuthDashboardPreview({ variant = 'full', className = '' }: AuthDashboardPreviewProps) {
  const t = useTranslations('auth.marketing')
  const isCompact = variant === 'compact'
  const [tab, setTab] = useState<PreviewTab>('overview')
  const [animate, setAnimate] = useState(false)

  const selectTab = useCallback((next: PreviewTab) => {
    setAnimate(false)
    setTab(next)
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(frame)
  }, [tab])

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimate(false)
      setTab((current) => TABS[(TABS.indexOf(current) + 1) % TABS.length])
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const stats = [
    { key: 'students', value: '248', icon: Users, color: 'text-emerald-400 bg-emerald-500/15' },
    { key: 'classes', value: '12', icon: DoorOpen, color: 'text-sky-400 bg-sky-500/15' },
    { key: 'collected', value: '4.2M', icon: Banknote, color: 'text-amber-400 bg-amber-500/15' },
    { key: 'rate', value: '87%', icon: TrendingUp, color: 'text-violet-400 bg-violet-500/15' },
  ] as const

  return (
    <div className={`relative min-w-0 ${className}`}>
      <div
        className="pointer-events-none absolute -inset-3 rounded-2xl bg-emerald-500/15 blur-2xl"
        aria-hidden
      />

      <div
        className={`relative overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/40 ${
          isCompact ? 'rounded-lg' : ''
        }`}
      >
        <div
          className={`flex items-center gap-2 border-b border-slate-700/80 bg-slate-800/95 ${
            isCompact ? 'px-3 py-2' : 'px-4 py-2.5'
          }`}
        >
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
          </div>
          <div className="mx-auto flex flex-1 justify-center">
            <span
              className={`rounded-md bg-slate-900/80 px-3 text-slate-500 ${
                isCompact ? 'py-0.5 text-[9px]' : 'py-1 text-[10px]'
              }`}
            >
              {t('preview.windowTitle')}
            </span>
          </div>
        </div>

        <div
          className={`flex gap-1 border-b border-slate-800 bg-slate-900/80 px-2 pt-2 ${
            isCompact ? 'px-1.5' : 'px-3'
          }`}
          role="tablist"
          aria-label={t('preview.tabsLabel')}
        >
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => selectTab(id)}
              className={`rounded-t-md px-2.5 font-medium transition-all ${
                isCompact ? 'py-1 text-[9px]' : 'py-1.5 text-[10px]'
              } ${
                tab === id
                  ? 'bg-slate-800 text-emerald-400 shadow-[inset_0_1px_0_rgba(52,211,153,0.35)]'
                  : 'text-slate-500 hover:bg-slate-800/60 hover:text-slate-300'
              }`}
            >
              {t(`preview.tabs.${id}`)}
            </button>
          ))}
        </div>

        <div
          className={`auth-preview-body relative overflow-hidden bg-slate-900 ${
            isCompact ? 'h-[148px] p-2.5' : 'h-[200px] p-3.5 lg:h-[220px] xl:h-[240px] 2xl:h-[260px] 2xl:p-4'
          }`}
        >
          {tab === 'overview' && (
            <div className="flex h-full flex-col gap-2.5">
              <div className={`grid grid-cols-4 gap-1.5 ${isCompact ? 'gap-1' : 'gap-2'}`}>
                {stats.map(({ key, value, icon: Icon, color }, i) => (
                  <div
                    key={key}
                    className={`rounded-lg border border-slate-700/60 bg-slate-800/70 transition-all duration-500 ${
                      isCompact ? 'p-1.5' : 'p-2'
                    } ${animate ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}`}
                    style={{ transitionDelay: `${i * 60}ms` }}
                  >
                    <div className={`mb-1 inline-flex rounded-md p-0.5 ${color}`}>
                      <Icon className={isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                    </div>
                    <p className={`font-bold tabular-nums text-white ${isCompact ? 'text-[11px]' : 'text-sm'}`}>
                      {value}
                    </p>
                    <p className={`truncate text-slate-500 ${isCompact ? 'text-[8px]' : 'text-[9px]'}`}>
                      {t(`preview.stats.${key}`)}
                    </p>
                  </div>
                ))}
              </div>

              {!isCompact && (
                <div
                  className={`flex flex-1 flex-col rounded-lg border border-slate-700/60 bg-slate-800/50 p-2.5 transition-all duration-500 ${
                    animate ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                    {t('preview.chartTitle')}
                  </p>
                  <div className="flex flex-1 items-end gap-1.5">
                    {CHART_HEIGHTS.map((h, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-sm bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-700 ease-out"
                          style={{
                            height: animate ? `${h}%` : '0%',
                            transitionDelay: `${120 + i * 50}ms`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isCompact && (
                <div className="flex flex-1 items-end gap-1">
                  {CHART_HEIGHTS.slice(0, 5).map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-700"
                      style={{
                        height: animate ? `${h * 0.55}px` : '0px',
                        transitionDelay: `${80 + i * 40}ms`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'payments' && (
            <div className="flex h-full flex-col gap-1.5">
              <p className={`font-semibold text-slate-400 ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>
                {t('preview.payments.recent')}
              </p>
              {[1, 2, 3].map((n, i) => (
                <div
                  key={n}
                  className={`flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/70 transition-all duration-500 ${
                    isCompact ? 'px-2 py-1.5' : 'px-2.5 py-2'
                  } ${animate ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'}`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div className="min-w-0">
                    <p className={`truncate font-medium text-slate-200 ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
                      {t(`preview.payments.items.${n}.name`)}
                    </p>
                    <p className={`text-slate-500 ${isCompact ? 'text-[8px]' : 'text-[9px]'}`}>
                      {t('preview.payments.receipt', { n: String(1200 + n) })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold tabular-nums text-emerald-400 ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
                      {t(`preview.payments.items.${n}.amount`)}
                    </p>
                    <span className={`rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-emerald-400 ${isCompact ? 'text-[7px]' : 'text-[8px]'}`}>
                      {t('preview.payments.paid')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'students' && (
            <div className="flex h-full flex-col gap-1.5">
              <p className={`font-semibold text-slate-400 ${isCompact ? 'text-[9px]' : 'text-[10px]'}`}>
                {t('preview.students.title')}
              </p>
              {(['paid', 'partial', 'unpaid'] as const).map((status, i) => (
                <div
                  key={status}
                  className={`flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/70 transition-all duration-500 ${
                    isCompact ? 'px-2 py-1.5' : 'px-2.5 py-2'
                  } ${animate ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'}`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      status === 'paid'
                        ? 'bg-emerald-400'
                        : status === 'partial'
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-slate-200 ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
                      {t(`preview.students.rows.${status}.name`)}
                    </p>
                    <p className={`text-slate-500 ${isCompact ? 'text-[8px]' : 'text-[9px]'}`}>
                      {t(`preview.students.rows.${status}.detail`)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 font-medium ${
                      status === 'paid'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : status === 'partial'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-red-500/15 text-red-400'
                    } ${isCompact ? 'text-[7px]' : 'text-[8px]'}`}
                  >
                    {t(`preview.students.${status}`)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p
            className={`pointer-events-none absolute bottom-1.5 right-2 text-slate-600 ${
              isCompact ? 'text-[7px]' : 'text-[8px]'
            }`}
          >
            {t('preview.hint')}
          </p>
        </div>
      </div>
    </div>
  )
}
