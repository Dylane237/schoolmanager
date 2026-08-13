'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { Shield, ChevronRight, Calendar, Sparkles, Users } from 'lucide-react'
import { useSchool } from './SchoolProvider'
import { useLicenceStatus } from '@/hooks/useLicenceStatus'
import { PLAN_LABELS, type LicencePlan } from '@/lib/licence-constants'
import { getIntlLocale, type Locale } from '@/i18n/config'

const PLAN_SHORT: Record<string, string> = {
  starter: 'Starter',
  standard: 'Standard',
  premium: 'Premium',
}

const PLAN_RING: Record<string, string> = {
  starter: 'from-slate-500 to-slate-600',
  standard: 'from-blue-500 to-indigo-600',
  premium: 'from-emerald-500 to-teal-600',
}

export default function LicenceTopBarButton() {
  const { slug } = useSchool()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('licence.sidebar')
  const locale = useLocale() as Locale
  const intlLocale = getIntlLocale(locale)
  const { status, loading } = useLicenceStatus()
  const [hover, setHover] = useState(false)

  const href = `/${slug}/licence`
  const active = pathname.startsWith(href)
  const plan = status?.plan ?? null
  const daysLeft = status?.daysLeft ?? null

  const expired = daysLeft !== null && daysLeft < 0
  const urgent = daysLeft !== null && daysLeft <= 30 && !expired
  const planLabel = plan ? (PLAN_SHORT[plan] || plan) : t('label')
  const ringClass = plan ? (PLAN_RING[plan] ?? PLAN_RING.starter) : PLAN_RING.starter

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString(intlLocale, {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  const timeLabel = loading
    ? '…'
    : expired
      ? t('expired')
      : daysLeft !== null
        ? daysLeft === 0
          ? t('expiresToday')
          : t('daysRemaining', { n: daysLeft })
        : '—'

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={() => router.push(href)}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left transition-all ${
          active
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-500 text-white shadow-md shadow-emerald-500/20'
            : urgent
              ? 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
          active ? 'bg-white/20' : `bg-gradient-to-br ${ringClass}`
        }`}>
          <Shield className="w-3.5 h-3.5 text-white" strokeWidth={2} />
        </div>
        <div className="hidden lg:block min-w-0">
          <p className="text-xs font-semibold truncate leading-tight">{t('label')}</p>
          <p className={`text-[10px] truncate leading-tight ${
            active ? 'text-white/75' : expired ? 'text-red-500' : urgent ? 'text-amber-600' : 'text-slate-500'
          }`}>
            {planLabel}{!loading && daysLeft !== null ? ` · ${timeLabel}` : loading ? ` · ${timeLabel}` : ''}
          </p>
        </div>
        <ChevronRight className={`w-3.5 h-3.5 shrink-0 hidden lg:block ${
          active ? 'text-white/60' : 'text-slate-400'
        }`} />
      </button>

      {hover && !active && (
        <div className="absolute top-full right-0 mt-2 z-50 w-72 pointer-events-none">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-left">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <p className="text-xs font-semibold text-white">
                {status?.planLabel || (plan ? PLAN_LABELS[plan as LicencePlan] : t('label'))}
              </p>
            </div>
            <div className="space-y-1.5 text-xs text-slate-400">
              <p className="flex items-center gap-2">
                <Calendar className="w-3 h-3 shrink-0 text-slate-500" />
                {t('expiresOn', { date: formatDate(status?.dateFin ?? null) })}
              </p>
              {status && (
                <p className="flex items-center gap-2">
                  <Users className="w-3 h-3 shrink-0 text-slate-500" />
                  {t('activeStudents', { n: status.studentCount })}
                  {status.studentLimit
                    ? t('maxStudents', { limit: status.studentLimit })
                    : t('unlimited')}
                </p>
              )}
            </div>
            <p className="text-[10px] text-emerald-400/80 mt-2.5 font-medium">{t('hint')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
