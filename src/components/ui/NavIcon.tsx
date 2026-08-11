import type { LucideIcon } from 'lucide-react'

type NavIconProps = {
  icon: LucideIcon
  active?: boolean
}

/** Icône de navigation sidebar — conteneur + trait fin cohérent */
export default function NavIcon({ icon: Icon, active = false }: NavIconProps) {
  return (
    <span
      className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200 ${
        active
          ? 'bg-white/20 shadow-inner'
          : 'bg-slate-800/60 group-hover:bg-slate-800'
      }`}
    >
      <Icon
        className="w-[17px] h-[17px]"
        strokeWidth={active ? 2.25 : 1.75}
      />
    </span>
  )
}
