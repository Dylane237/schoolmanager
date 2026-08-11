'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Tableau de bord', href: '/admin-licences' },
  { label: 'Licences', href: '/admin-licences/licences' },
  { label: 'Parrainages', href: '/admin-licences/parrainages' },
]

function LoginScreen({ onAuth }: { onAuth: () => void }) {
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
    else setError('Mot de passe incorrect')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
      <div style={{ background: '#1e293b', borderRadius: 16, border: '1px solid #334155', padding: 36, width: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 36, height: 36, background: '#10b981', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#fff' }}>S</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>SchoolManager</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Administration éditeur (cloud)</div>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
          Connexion requise — licences et parrainages centralisés sur Supabase.
        </p>
        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6, fontWeight: 500 }}>Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="••••••••"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none', marginBottom: 8 }}
        />
        {error && <p style={{ color: '#ef4444', fontSize: 13, margin: '4px 0 8px' }}>{error}</p>}
        <button
          onClick={handleLogin}
          disabled={loading || !password}
          style={{ width: '100%', padding: '10px 0', background: '#10b981', color: '#fff', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8, opacity: loading || !password ? 0.6 : 1 }}
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </div>
    </div>
  )
}

function Header({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname()
  return (
    <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: '#10b981', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' }}>S</div>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>SchoolManager</span>
        <span style={{ color: '#475569', fontSize: 13, marginLeft: 4 }}>Administration éditeur</span>
      </div>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {NAV.map(item => (
          <Link key={item.href} href={item.href} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', background: pathname === item.href ? '#334155' : 'transparent', color: pathname === item.href ? '#fff' : '#94a3b8' }}>
            {item.label}
          </Link>
        ))}
        <button onClick={onLogout} type="button" style={{ marginLeft: 12, padding: '6px 14px', background: 'transparent', color: '#64748b', border: 'none', fontSize: 14, cursor: 'pointer' }}>
          Déconnexion
        </button>
      </nav>
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
  const { authed, checkAuth, logout, setAuthed } = useAdminLicencesAuth()

  if (authed === null) {
    return <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Chargement...</div>
  }

  if (!authed) {
    return <LoginScreen onAuth={() => { setAuthed(true); checkAuth() }} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      <Header onLogout={logout} />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {children}
      </main>
    </div>
  )
}

export function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: color + '22', color, border: `1px solid ${color}44` }}>
      {children}
    </span>
  )
}

export const STATUT_COLORS: Record<string, string> = {
  en_cours: '#64748b',
  abonnement_actif: '#10b981',
  commission_versee: '#8b5cf6',
  annule: '#ef4444',
}

export const STATUT_LABELS: Record<string, string> = {
  en_cours: 'En cours',
  abonnement_actif: 'Abonnement actif',
  commission_versee: 'Commission versée',
  annule: 'Annulé',
}
