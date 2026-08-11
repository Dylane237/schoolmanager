'use client'

import Image from 'next/image'

type AuthDashboardPreviewProps = {
  variant?: 'full' | 'compact'
  className?: string
}

export function AuthDashboardPreview({ variant = 'full', className = '' }: AuthDashboardPreviewProps) {
  const isCompact = variant === 'compact'

  return (
    <div className={`relative ${className}`}>
      <div
        className="pointer-events-none absolute -inset-3 rounded-2xl bg-emerald-500/15 blur-2xl"
        aria-hidden
      />

      <div
        className={`relative overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/40 ${
          isCompact ? 'rounded-lg' : ''
        }`}
      >
        {/* Barre fenêtre — comme l'app */}
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
              SchoolManager — Tableau de bord
            </span>
          </div>
        </div>

        <div className={`relative w-full overflow-hidden ${isCompact ? 'h-[150px]' : 'h-[240px] 2xl:h-[260px]'}`}>
          <Image
            src="/auth/dashboard-preview.png"
            alt="Aperçu du tableau de bord SchoolManager"
            fill
            priority
            className="object-cover object-left-top"
            sizes={isCompact ? '100vw' : '(max-width: 1280px) 50vw, 600px'}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-900 to-transparent"
            aria-hidden
          />
        </div>
      </div>
    </div>
  )
}
