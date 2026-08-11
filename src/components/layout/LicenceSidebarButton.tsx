'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Shield, ChevronRight, Users, Calendar, Sparkles } from 'lucide-react'
import { useSchool } from './SchoolProvider'
import { useLicenceStatus } from '@/hooks/useLicenceStatus'
import { PLAN_LABELS, type LicencePlan } from '@/lib/licence-constants'

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

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function LicenceSidebarButton() {
  const { slug } = useSchool()
  const pathname = usePathname()
  const router = useRouter()
  const { status, loading } = useLicenceStatus()
  const [hover, setHover] = useState(false)

  const href = `/${slug}/licence`
  const active = pathname.startsWith(href)
  const plan = status?.plan ?? null
  const daysLeft = status?.daysLeft ?? null

  const expired = daysLeft !== null && daysLeft < 0
  const urgent = daysLeft !== null && daysLeft <= 30 && !expired
  const planLabel = plan ? (PLAN_SHORT[plan] || plan) : 'Licence'

  const ringClass = plan ? (PLAN_RING[plan] ?? PLAN_RING.starter) : PLAN_RING.starter

  const timeLabel = loading
    ? '…'
    : expired
      ? 'Expirée'
      : daysLeft !== null
        ? daysLeft === 0
          ? "Expire aujourd'hui"
          : `${daysLeft}j restants`
        : '—'

  return (
    <div
      className="relative mx-1 mb-1"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={() => router.push(href)}
        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-left group ${
          active
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20'
            : urgent
              ? 'bg-amber-500/10 border border-amber-500/25 text-amber-100 hover:bg-amber-500/15'
              : 'bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600'
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          active
            ? 'bg-white/20'
            : `bg-gradient-to-br ${ringClass}`
        }`}>
          <Shield className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${active ? 'text-white' : ''}`}>
            Licence
          </p>
          <p className={`text-xs truncate ${
            active ? 'text-white/75' : expired ? 'text-red-400' : urgent ? 'text-amber-400/90' : 'text-slate-500'
          }`}>
            {planLabel}{!loading && daysLeft !== null ? ` · ${timeLabel}` : loading ? ` · ${timeLabel}` : ''}
          </p>
        </div>
        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
          active ? 'text-white/60' : 'text-slate-600'
        }`} />
      </button>

      {hover && !active && (
        <div className="absolute bottom-full left-0 right-0 mb-2 z-50 pointer-events-none">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3.5 shadow-2xl shadow-black/40 text-left">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <p className="text-xs font-semibold text-white">
                {status?.planLabel || (plan ? PLAN_LABELS[plan as LicencePlan] : 'Licence SchoolManager')}
              </p>
            </div>
            <div className="space-y-1.5 text-xs text-slate-400">
              <p className="flex items-center gap-2">
                <Calendar className="w-3 h-3 shrink-0 text-slate-500" />
                Expire le {formatDate(status?.dateFin ?? null)}
              </p>
              {status && (
                <p className="flex items-center gap-2">
                  <Users className="w-3 h-3 shrink-0 text-slate-500" />
                  {status.studentCount} élève{status.studentCount !== 1 ? 's' : ''} actif{status.studentCount !== 1 ? 's' : ''}
                  {status.studentLimit ? ` / ${status.studentLimit} max` : ' · illimité'}
                </p>
              )}
              {status?.planPrice && (
                <p className="text-slate-500 pt-0.5 border-t border-slate-700/50 mt-1">
                  {status.planPrice.toLocaleString('fr-FR')} FCFA / an
                </p>
              )}
            </div>
            <p className="text-[10px] text-emerald-400/80 mt-2.5 font-medium">
              Cliquer pour gérer · renouveler · upgrader
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
