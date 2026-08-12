'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Menu, X, Shield, LogOut } from 'lucide-react'

function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const t = useTranslations('adminLicences.auth')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin-licences/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) onAuth()
    else setError(t('wrongPassword'))
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white">SchoolManager</p>
            <p className="text-xs text-slate-500">{t('title')}</p>
          </div>
        </div>
        <p className="text-sm text-slate-400 mb-6">{t('subtitle')}</p>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">{t('password')}</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="••••••••"
          className="w-full px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950 text-slate-100 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 mb-2"
        />
        {error && <p className="text-sm text-red-400 mb-2">{error}</p>}
        <button
          type="button"
          onClick={handleLogin}
          disabled={loading || !password}
          className="w-full mt-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
        >
          {loading ? t('submitting') : t('submit')}
        </button>
      </div>
    </div>
  )
}

function Header({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname()
  const t = useTranslations('adminLicences')
  const [open, setOpen] = useState(false)

  const NAV = [
    { labelKey: 'dashboard' as const, href: '/admin-licences' },
    { labelKey: 'licences' as const, href: '/admin-licences/licences' },
    { labelKey: 'referrals' as const, href: '/admin-licences/parrainages' },
  ]

  const isActive = (href: string) =>
    href === '/admin-licences' ? pathname === href : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-white truncate">SchoolManager</p>
            <p className="text-[10px] text-slate-500 hidden sm:block">{t('auth.title')}</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {t(`nav.${item.labelKey}`)}
            </Link>
          ))}
          <button
            type="button"
            onClick={onLogout}
            className="ml-2 flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-300"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden lg:inline">{t('auth.logout')}</span>
          </button>
        </nav>

        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800"
          aria-label={t('auth.menu')}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-slate-800 px-4 py-3 space-y-1 bg-slate-900">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2.5 rounded-xl text-sm font-medium ${
                isActive(item.href) ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
            >
              {t(`nav.${item.labelKey}`)}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => { setOpen(false); onLogout() }}
            className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-slate-500"
          >
            {t('auth.logout')}
          </button>
        </nav>
      )}
    </header>
  )
}

export function useAdminLicencesAuth() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  const checkAuth = useCallback(async () => {
    const res = await fetch('/api/admin-licences/list')
    setAuthed(res.ok)
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])

  const logout = async () => {
    await fetch('/api/admin-licences/auth', { method: 'DELETE' })
    setAuthed(false)
  }

  return { authed, checkAuth, logout, setAuthed }
}

export function AdminLicencesShell({ children }: { children: ReactNode }) {
  const t = useTranslations('adminLicences.auth')
  const { authed, checkAuth, logout, setAuthed } = useAdminLicencesAuth()

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-500 text-sm">
        {t('loading')}
      </div>
    )
  }

  if (!authed) {
    return <LoginScreen onAuth={() => { setAuthed(true); checkAuth() }} />
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Header onLogout={logout} />
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}

const TONE_CLASS = {
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  danger: 'bg-red-500/15 text-red-300 border-red-500/30',
  neutral: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
}

export function AdminBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: keyof typeof TONE_CLASS
}) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  )
}

export const STATUT_COLORS: Record<string, keyof typeof TONE_CLASS> = {
  en_cours: 'neutral',
  abonnement_actif: 'success',
  commission_versee: 'success',
  annule: 'danger',
}

export function useReferralStatusLabel() {
  const t = useTranslations('adminLicences.referrals.status')
  return (statut: string) => t(statut as 'en_cours', { defaultValue: statut })
}
