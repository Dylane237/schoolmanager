'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Licence = {
  id: string
  cle_licence: string
  type: string
  date_debut: string
  date_fin: string
  is_active: number
  created_at: string
  ecole_id: string | null
  ecoles: { nom: string } | null
}

const PLANS = ['starter', 'standard', 'premium']
const PLAN_COLOR: Record<string, string> = { starter: '#6366f1', standard: '#3b82f6', premium: '#10b981' }

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: color + '22', color, border: `1px solid ${color}44` }}>
      {children}
    </span>
  )
}

function StatusBadge({ l }: { l: Licence }) {
  if (!l.is_active) return <Badge color="#ef4444">Révoquée</Badge>
  const days = Math.floor((new Date(l.date_fin).getTime() - Date.now()) / 86400000)
  if (days < 0) return <Badge color="#ef4444">Expirée</Badge>
  if (days <= 30) return <Badge color="#f59e0b">Expire dans {days}j</Badge>
  return <Badge color="#10b981">Active</Badge>
}

function Header({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname()
  const navItems = [
    { label: 'Tableau de bord', href: '/admin-licences' },
    { label: 'Licences', href: '/admin-licences/licences' },
  ]
  return (
    <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: '#10b981', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' }}>S</div>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#fff' }}>SchoolManager</span>
        <span style={{ color: '#475569', fontSize: 13, marginLeft: 4 }}>Administration éditeur</span>
      </div>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none', background: pathname === item.href ? '#334155' : 'transparent', color: pathname === item.href ? '#fff' : '#94a3b8' }}>
            {item.label}
          </Link>
        ))}
        <button onClick={onLogout} style={{ marginLeft: 12, padding: '6px 14px', background: 'transparent', color: '#64748b', border: 'none', fontSize: 14, cursor: 'pointer' }}>
          ⎋ Déconnexion
        </button>
      </nav>
    </header>
  )
}

function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    const res = await fetch('/api/admin-licences/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
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
            <div style={{ fontSize: 12, color: '#64748b' }}>Administration éditeur</div>
          </div>
        </div>
        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6, fontWeight: 500 }}>Mot de passe</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box', outline: 'none', marginBottom: 8 }} />
        {error && <p style={{ color: '#ef4444', fontSize: 13, margin: '4px 0 8px' }}>{error}</p>}
        <button onClick={handleLogin} disabled={loading || !password}
          style={{ width: '100%', padding: '10px 0', background: '#10b981', color: '#fff', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8, opacity: loading || !password ? 0.6 : 1 }}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </div>
    </div>
  )
}

export default function LicencesPage() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [licences, setLicences] = useState<Licence[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'toutes' | 'disponibles' | 'attribuees'>('toutes')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ plan: 'standard', date_fin: '' })
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [copied, setCopied] = useState('')
  const [search, setSearch] = useState('')

  const loadLicences = useCallback(async () => {
