'use client'

import Link from 'next/link'
import { ArrowLeft, GraduationCap } from 'lucide-react'
import { AuthLeftPanel } from './auth-left-panel'

type AuthSplitLayoutProps = {
  mode: 'login' | 'register'
  title: string
  subtitle: string
  children: React.ReactNode
  footer: React.ReactNode
}

export function AuthSplitLayout({ mode, title, subtitle, children, footer }: AuthSplitLayoutProps) {
  const alternate = mode === 'login'
    ? { href: '/register', label: 'Créer un compte' }
    : { href: '/login', label: 'Se connecter' }

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <AuthLeftPanel />

      <main className="relative flex flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.06),transparent)]"
          aria-hidden
        />

        <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/25">
              <GraduationCap className="h-4 w-4 text-emerald-400" strokeWidth={1.75} />
            </div>
            <span className="text-base font-semibold text-white">
              School<span className="text-emerald-400">Manager</span>
            </span>
          </div>

          <Link
            href={alternate.href}
            className="ml-auto flex items-center gap-1.5 text-[13px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
            {mode === 'register' && <ArrowLeft className="h-3.5 w-3.5" />}
            {alternate.label}
          </Link>
        </header>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-8 lg:px-10">
          <div className="w-full max-w-[420px]">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
              <p className="mt-2 text-[14px] text-zinc-500">{subtitle}</p>
            </div>

            {children}

            <p className="mt-6 text-center text-[13px] text-zinc-600">{footer}</p>
          </div>
        </div>

        <footer className="relative z-10 px-6 py-4 text-center text-[12px] text-zinc-700 lg:px-10">
          © {new Date().getFullYear()} SchoolManager · Tous droits réservés
        </footer>
      </main>
    </div>
  )
}
