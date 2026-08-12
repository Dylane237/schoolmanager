'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import {
  Shield, Key, Users, Calendar, AlertTriangle, CheckCircle2,
  ArrowUpCircle, RefreshCw, Sparkles, Crown, Zap,
} from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import AppUpdates from '@/components/parametres/AppUpdates'
import SupportTools from '@/components/parametres/SupportTools'
import ReferralProgram from '@/components/licence/ReferralProgram'
import { WhatsAppSupportLink } from '@/components/support/whatsapp-support-link'
import { useSchool } from '@/components/layout/SchoolProvider'
import { useLicenceStatus } from '@/hooks/useLicenceStatus'
import toast from 'react-hot-toast'
import { getSupportWhatsAppUrl } from '@/lib/support'
import { getIntlLocale, type Locale } from '@/i18n/config'
import {
  PLAN_PRICES, PLAN_STUDENT_LIMITS, type LicencePlan,
} from '@/lib/licence-constants'

const PLAN_ICONS: Record<LicencePlan, typeof Shield> = {
  starter: Shield,
  standard: Zap,
  premium: Crown,
}

const PLAN_GRADIENT: Record<LicencePlan, string> = {
  starter: 'from-slate-700 via-slate-800 to-slate-900',
  standard: 'from-blue-700 via-indigo-800 to-slate-900',
  premium: 'from-emerald-600 via-teal-700 to-slate-900',
}

const PLAN_ACCENT: Record<LicencePlan, string> = {
  starter: 'text-slate-300',
  standard: 'text-blue-200',
  premium: 'text-emerald-200',
}

function DaysRing({ daysLeft, label }: { daysLeft: number; label: string }) {
  const pct = Math.max(0, Math.min(100, (daysLeft / 365) * 100))
  const r = 36
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const color = daysLeft <= 7 ? '#ef4444' : daysLeft <= 30 ? '#f59e0b' : '#10b981'

  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle
          cx="44" cy="44" r={r} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white leading-none">{Math.max(0, daysLeft)}</span>
        <span className="text-[10px] text-white/60 uppercase tracking-wide">{label}</span>
      </div>
    </div>
  )
}

export default function LicencePage() {
  const locale = useLocale() as Locale
  const intlLocale = getIntlLocale(locale)
  const router = useRouter()
  const { userRole } = useSchool()
  const t = useTranslations('licence.page')
  const tp = useTranslations('licence.plans')
  const tc = useTranslations('common')
  const { status, loading, refresh } = useLicenceStatus()
  const [renewKey, setRenewKey] = useState('')
  const [renewing, setRenewing] = useState(false)
  const [showRenew, setShowRenew] = useState(false)

  const canRenew = userRole === 'admin' || userRole === 'super_admin'
  const plan = status?.plan
  const daysLeft = status?.daysLeft ?? null
  const expired = daysLeft !== null && daysLeft < 0
  const urgent = daysLeft !== null && daysLeft <= 30 && !expired

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString(intlLocale, {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  const handleRenew = async () => {
    const cle = renewKey.trim()
    if (!cle) return
    setRenewing(true)
    try {
      const res = await fetch('/api/licence/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cle }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || t('toasts.renewFailed'))
        return
      }
      toast.success(t('toasts.renewSuccess'))
      setRenewKey('')
      setShowRenew(false)
      await refresh()
      router.refresh()
    } catch {
      toast.error(t('toasts.networkError'))
    } finally {
      setRenewing(false)
    }
  }

  const whatsappMsg = plan
    ? t('whatsappRenew', { plan })
    : t('whatsappHelp')

  const PlanIcon = plan ? PLAN_ICONS[plan] : Shield
  const gradient = plan ? PLAN_GRADIENT[plan] : PLAN_GRADIENT.starter

  if (loading) {
    return (
      <PageShell title={t('title')} subtitle="" breadcrumb={t('breadcrumb')}>
        <div className="flex items-center justify-center h-64 text-slate-400">{tc('loading')}</div>
      </PageShell>
    )
  }

  return (
    <PageShell
      title={t('title')}
      subtitle={t('subtitle')}
      breadcrumb={t('breadcrumb')}
      fullWidth
    >
      <div className="space-y-6 max-w-6xl">

        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 lg:p-8 shadow-xl`}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                {status?.active ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {t('active')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-300 bg-red-500/20 border border-red-400/30 px-2.5 py-1 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5" /> {t('inactive')}
                  </span>
                )}
                {urgent && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-500/20 border border-amber-400/30 px-2.5 py-1 rounded-full">
                    {t('renewSoon')}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <PlanIcon className={`w-6 h-6 ${plan ? PLAN_ACCENT[plan] : 'text-white'}`} />
                </div>
                <div>
                  <h2 className="text-2xl lg:text-3xl font-bold text-white">
                    {status?.planLabel?.split('—')[0]?.trim() || t('yourPlan')}
                  </h2>
                  <p className={`text-sm ${plan ? PLAN_ACCENT[plan] : 'text-slate-300'}`}>
                    {status?.planPrice
                      ? t('pricePerYear', { price: status.planPrice.toLocaleString(intlLocale) })
                      : t('annualSubscription')}
                  </p>
                </div>
              </div>

              <p className="text-white/60 text-sm mt-3 max-w-md">
                {t('validUntil', { date: formatDate(status?.dateFin ?? null) })}
                {status?.cleMasked && (
                  <> · {t('key')} <code className="font-mono text-white/80 bg-white/10 px-1.5 py-0.5 rounded text-xs">{status.cleMasked}</code></>
                )}
              </p>
            </div>

            {daysLeft !== null && daysLeft >= 0 && (
              <DaysRing daysLeft={daysLeft} label={t('days')} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('studentQuota')}</p>
                </div>
                <p className="text-3xl font-bold text-slate-800">
                  {status?.studentCount ?? 0}
                  <span className="text-lg font-normal text-slate-400">
                    {status?.studentLimit ? ` / ${status.studentLimit}` : ' / ∞'}
                  </span>
                </p>
                {status?.studentLimit && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>{t('usage')}</span>
                      <span>{status.usagePercent ?? 0}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (status.usagePercent ?? 0) >= 90 ? 'bg-red-500'
                            : (status.usagePercent ?? 0) >= 75 ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${status.usagePercent ?? 0}%` }}
                      />
                    </div>
                  </div>
                )}
                {!status?.studentLimit && (
                  <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {t('unlimitedStudents')}
                  </p>
                )}
              </div>

              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('period')}</p>
                </div>
                <p className="text-sm text-slate-600">
                  {t('since')} <strong className="text-slate-800">{formatDate(status?.dateDebut ?? null)}</strong>
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {t('until')} <strong className="text-slate-800">{formatDate(status?.dateFin ?? null)}</strong>
                </p>
                <p className={`text-lg font-bold mt-2 ${
                  expired ? 'text-red-600' : urgent ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {expired
                    ? t('expired')
                    : daysLeft !== null
                      ? t('daysRemaining', { count: daysLeft })
                      : '—'}
                </p>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-800">{t('comparePlans')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{t('allPlansInclude')}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                {(['starter', 'standard', 'premium'] as LicencePlan[]).map(p => {
                  const Icon = PLAN_ICONS[p]
                  const isCurrent = plan === p
                  return (
                    <div
                      key={p}
                      className={`p-5 ${isCurrent ? 'bg-emerald-50/50' : ''}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`w-4 h-4 ${isCurrent ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span className="font-semibold text-slate-800 capitalize">{p}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            {t('current')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mb-2">{tp(`hints.${p}`)}</p>
                      <p className="text-lg font-bold text-slate-800">
                        {t('pricePerYear', {
                          price: PLAN_PRICES[p].toLocaleString(intlLocale),
                        })}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {PLAN_STUDENT_LIMITS[p]
                          ? t('studentsMax', { n: PLAN_STUDENT_LIMITS[p]! })
                          : t('unlimited')}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-slate-800">{t('needHelp')}</h3>
              <WhatsAppSupportLink message={whatsappMsg} />

              {plan && plan !== 'premium' && (
                <a
                  href={getSupportWhatsAppUrl(t('whatsappUpgrade', { plan }))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full border border-violet-200 text-violet-700 font-semibold rounded-xl px-4 py-3 hover:bg-violet-50 transition-colors text-sm"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  {t('upgradePlan')}
                </a>
              )}
            </div>

            {canRenew && (
              <div className="card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Key className="w-4 h-4 text-slate-400" /> {t('renew')}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowRenew(v => !v)}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    {showRenew ? t('close') : t('enterKey')}
                  </button>
                </div>
                {!showRenew ? (
                  <p className="text-xs text-slate-500 leading-relaxed">{t('renewHint')}</p>
                ) : (
                  <div className="space-y-3">
                    <input
                      value={renewKey}
                      onChange={e => setRenewKey(e.target.value.toUpperCase())}
                      placeholder={t('keyPlaceholder')}
                      className="input-field font-mono uppercase tracking-wider text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleRenew}
                      disabled={renewing || !renewKey.trim()}
                      className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                    >
                      {renewing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t('verifying')}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" /> {t('activateKey')}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <ReferralProgram />

        <SupportTools />

        <AppUpdates />
      </div>
    </PageShell>
  )
}
