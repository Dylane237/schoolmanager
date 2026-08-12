'use client'

import { useTranslations } from 'next-intl'
import { Banknote, Users, FileText, type LucideIcon } from 'lucide-react'

const FEATURE_IDS = ['tranches', 'lists', 'grades'] as const
const FEATURE_ICONS: Record<(typeof FEATURE_IDS)[number], LucideIcon> = {
  tranches: Banknote,
  lists: Users,
  grades: FileText,
}
const FEATURE_COLORS: Record<(typeof FEATURE_IDS)[number], string> = {
  tranches: 'text-amber-400 bg-amber-500/10 ring-amber-500/20',
  lists: 'text-blue-400 bg-blue-500/10 ring-blue-500/20',
  grades: 'text-violet-400 bg-violet-500/10 ring-violet-500/20',
}

export function AuthFeatureList({ className = '' }: { className?: string }) {
  const t = useTranslations('auth.marketing.features')

  return (
    <ul className={`space-y-2 ${className}`}>
      {FEATURE_IDS.map(id => {
        const Icon = FEATURE_ICONS[id]
        return (
          <li
            key={id}
            className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]"
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${FEATURE_COLORS[id]}`}>
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-zinc-200">{t(`${id}.title`)}</p>
              <p className="truncate text-[11px] text-zinc-500">{t(`${id}.desc`)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
