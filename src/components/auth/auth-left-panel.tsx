'use client'

import { GraduationCap, BarChart3, Users, type LucideIcon } from 'lucide-react'

const FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: GraduationCap,
    title: 'Inscriptions simplifiées',
    desc: 'Fiches élèves, photos et matricules en quelques clics.',
  },
  {
    icon: BarChart3,
    title: 'Suivi financier',
    desc: 'Paiements, tranches et reçus centralisés par classe.',
  },
  {
    icon: Users,
    title: 'Toute l\'équipe',
    desc: 'Enseignants, secrétaires et comptables sur un seul espace.',
  },
]

export function AuthLeftPanel() {
  return (
    <aside className="relative hidden lg:flex lg:w-[44%] xl:w-[42%] flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-[#050505] p-10 xl:p-14">
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-emerald-500/[0.07] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-teal-400/[0.05] blur-3xl"
        aria-hidden
      />

      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/25 shadow-[0_0_24px_rgba(16,185,129,0.15)]">
            <GraduationCap className="h-5 w-5 text-emerald-400" strokeWidth={1.75} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">
            School<span className="text-emerald-400">Manager</span>
          </span>
        </div>

        <h1 className="mt-14 max-w-sm text-[2rem] font-bold leading-tight tracking-tight text-white xl:text-[2.35rem]">
          Gérez votre école
          <br />
          <span className="text-zinc-400">sans paperasse.</span>
        </h1>
        <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-zinc-500">
          Inscriptions, notes, présences et paiements — tout au même endroit, pensé pour les établissements camerounais.
        </p>
      </div>

      <div className="relative z-10 space-y-3">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="auth-feature-card group flex items-start gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/20 hover:bg-white/[0.04] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 transition-all duration-300 group-hover:bg-emerald-500/15 group-hover:ring-emerald-500/35 group-hover:shadow-[0_0_16px_rgba(16,185,129,0.12)]">
              <Icon className="h-4 w-4 text-emerald-400" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200">{title}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-zinc-500">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
