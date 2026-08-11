import type { LucideIcon } from 'lucide-react'

const TONES = {
  emerald: 'from-emerald-500/15 to-emerald-600/5 text-emerald-600 ring-emerald-500/20',
  blue: 'from-blue-500/15 to-blue-600/5 text-blue-600 ring-blue-500/20',
  violet: 'from-violet-500/15 to-violet-600/5 text-violet-600 ring-violet-500/20',
  amber: 'from-amber-500/15 to-amber-600/5 text-amber-600 ring-amber-500/20',
  rose: 'from-rose-500/15 to-rose-600/5 text-rose-600 ring-rose-500/20',
  sky: 'from-sky-500/15 to-sky-600/5 text-sky-600 ring-sky-500/20',
  slate: 'from-slate-500/15 to-slate-600/5 text-slate-600 ring-slate-500/20',
} as const

type SectionIconProps = {
  icon: LucideIcon
  tone?: keyof typeof TONES
  size?: 'sm' | 'md'
}

/** Icône de section — conteneur dégradé cohérent dans toute l’app */
export default function SectionIcon({ icon: Icon, tone = 'emerald', size = 'md' }: SectionIconProps) {
  const box = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-[18px] h-[18px]'

  return (
    <span
      className={`${box} rounded-xl bg-gradient-to-br ${TONES[tone]} ring-1 flex items-center justify-center shrink-0`}
    >
      <Icon className={iconSize} strokeWidth={1.75} />
    </span>
  )
}
