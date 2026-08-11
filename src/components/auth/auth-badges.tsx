'use client'

import { useState } from 'react'
import { WifiOff, Receipt, ShieldCheck, ChevronDown, type LucideIcon } from 'lucide-react'

type ValueProp = {
  id: string
  icon: LucideIcon
  label: string
  tagline: string
  problem: string
  solution: string
}

const VALUE_PROPS: ValueProp[] = [
  {
    id: 'offline',
    icon: WifiOff,
    label: '100 % offline',
    tagline: 'Pas besoin d\'Internet',
    problem:
      'Coupures de courant, connexion lente ou absente : beaucoup de logiciels s\'arrêtent net.',
    solution:
      'SchoolManager tourne entièrement sur votre PC. Internet sert uniquement à activer la licence.',
  },
  {
    id: 'tranches',
    icon: Receipt,
    label: 'Reçus par tranches',
    tagline: 'Paiements conformes',
    problem:
      'Cahiers de tranches, reçus à la main, disputes sur les soldes — erreurs et perte de temps.',
    solution:
      'Enregistrez chaque tranche, imprimez le reçu ORIGINAL/DUPLICATA, voyez qui doit encore en un clic.',
  },
  {
    id: 'local',
    icon: ShieldCheck,
    label: 'Données locales',
    tagline: 'Chez vous, pas dans le cloud',
    problem:
      'Peur de perdre les dossiers élèves ou de dépendre d\'un serveur étranger.',
    solution:
      'Tout est stocké sur votre ordinateur (Documents/SchoolManager). Sauvegardes automatiques incluses.',
  },
]

type AuthBadgesProps = {
  className?: string
  variant?: 'dark' | 'light'
  layout?: 'row' | 'stack'
}

export function AuthBadges({
  className = '',
  variant = 'dark',
  layout = 'row',
}: AuthBadgesProps) {
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
      {VALUE_PROPS.map(item => {
        const Icon = item.icon
        const isOpen = activeId === item.id

        return (
          <div
            key={item.id}
            onMouseEnter={() => setActiveId(item.id)}
            onMouseLeave={() => setActiveId(null)}
          >
            <button
              type="button"
              onClick={() => setActiveId(isOpen ? null : item.id)}
              className={`flex w-full flex-col overflow-hidden rounded-2xl border text-left transition-all duration-300 ${
                isDark
                  ? 'border-white/[0.08] bg-white/[0.03] hover:border-emerald-500/30 hover:bg-emerald-500/[0.06]'
                  : 'border-gray-200 bg-white shadow-sm hover:border-emerald-300 hover:shadow-md'
              } ${isOpen ? (isDark ? 'border-emerald-500/40 bg-emerald-500/[0.08] shadow-[0_12px_40px_rgba(16,185,129,0.15)]' : 'border-emerald-400 ring-2 ring-emerald-100') : ''}`}
              aria-expanded={isOpen}
            >
              {/* En-tête badge */}
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
                    {item.label}
                  </p>
                  <p className={`mt-0.5 text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                    {item.tagline}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  } ${isDark ? 'text-slate-600' : 'text-gray-400'}`}
                />
              </div>

              {/* Détail — s'ouvre au survol / clic */}
              <div
                className={`grid transition-all duration-300 ease-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className={`border-t px-4 pb-4 ${isDark ? 'border-white/[0.06]' : 'border-gray-100'}`}>
                    <div className={`mt-3 rounded-lg px-3 py-2.5 ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                        Le problème
                      </p>
                      <p className={`mt-1 text-[12px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        {item.problem}
                      </p>
                    </div>
                    <div className={`mt-2 rounded-lg px-3 py-2.5 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                        Ce que SchoolManager fait
                      </p>
                      <p className={`mt-1 text-[12px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                        {item.solution}
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
