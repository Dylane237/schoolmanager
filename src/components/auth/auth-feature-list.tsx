'use client'

import { Banknote, Users, FileText, type LucideIcon } from 'lucide-react'

const FEATURES: { icon: LucideIcon; title: string; desc: string; color: string }[] = [
  {
    icon: Banknote,
    title: 'Tranches & reçus',
    desc: 'Paiement → reçu imprimable → solde restant',
    color: 'text-amber-400 bg-amber-500/10 ring-amber-500/20',
  },
  {
    icon: Users,
    title: 'Listes & effectifs',
    desc: 'Élèves, matricules, classes par section',
    color: 'text-blue-400 bg-blue-500/10 ring-blue-500/20',
  },
  {
    icon: FileText,
    title: 'Bulletins & notes',
    desc: 'Francophone, anglophone et maternelle',
    color: 'text-violet-400 bg-violet-500/10 ring-violet-500/20',
  },
]

export function AuthFeatureList({ className = '' }: { className?: string }) {
  return (
    <ul className={`space-y-2 ${className}`}>
      {FEATURES.map(({ icon: Icon, title, desc, color }) => (
        <li
          key={title}
          className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]"
        >
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${color}`}>
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-zinc-200">{title}</p>
            <p className="truncate text-[11px] text-zinc-500">{desc}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
