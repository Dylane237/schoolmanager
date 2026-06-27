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
}

const PLANS = ['starter', 'standard', 'premium']
const PLAN_PRICES: Record<string, number> = { starter: 150000, standard: 350000, premium: 600000 }
const PLAN_COLOR: Record<string, string> = { starter: '#6366f1', standard: '#3b82f6', premium: '#10b981' }

// ─── Composants utilitaires ───────────────────────────────────────────────────

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: color + '22', color, border: `1px solid ${color}44` }}>
      {children}
    </span>
  )
}

function StatusBadge({ l, today }: { l: Licence; today: string }) {
  if (!l.is_active) return <Badge color="#ef4444">Révoquée</Badge>
  const days = Math.floor((new Date(l.date_fin).getTime() - Date.now()) / 86400000)
  if (days < 0) return <Badge color="#ef4444">Expirée</Badge>
  if (days <= 30) return <Badge color="#f59e0b">Expire dans {days}j</Badge>
  return <Badge color="#10b981">Active</Badge>
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: '20px 24px' }}>
      <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 8px' }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: color || '#e2e8f0', margin: '0 0 4px' }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{sub}</p>}
    </div>
  )
}

// ─── Auth wrapper ─────────────────────────────────────────────────────────────

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
            <div style={{ fontSize: 12, color: '#64748b' }}>Administration éditeur</div>
          </div>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>Connectez-vous pour accéder à l'administration.</p>
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

// ─── Header avec navigation ───────────────────────────────────────────────────

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
          <Link key={item.href} href={item.href} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none',
            background: pathname === item.href ? '#334155' : 'transparent',
            color: pathname === item.href ? '#fff' : '#94a3b8',
          }}>
            {item.label}
          </Link>
        ))}
        <button onClick={onLogout} style={{ marginLeft: 12, padding: '6px 14px', background: 'transparent', color: '#64748b', border: 'none', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          ⎋ Déconnexion
        </button>
      </nav>
    </header>
  )
}

// ─── Page principale (Dashboard) ──────────────────────────────────────────────

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [licences, setLicences] = useState<Licence[]>([])
  const [loading, setLoading] = useState(false)

  const loadLicences = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin-licences/list')
    if (res.ok) {
      const data = await res.json()
      setLicences(data.licences || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch('/api/admin-licences/list').then(r => {
      if (r.ok) { setAuthed(true); r.json().then(d => setLicences(d.licences || [])) }
      setChecking(false)
    }).catch(() => setChecking(false))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/admin-licences/auth', { method: 'DELETE' })
    setAuthed(false)
    setLicences([])
  }

  if (checking) return <div style={{ minHeight: '100vh', background: '#0f172a' }} />
  if (!authed) return <LoginScreen onAuth={() => { setAuthed(true); loadLicences() }} />

  const today = new Date().toISOString().split('T')[0]
  const actives = licences.filter(l => l.is_active && l.date_fin >= today)
  const expirant = actives.filter(l => {
    const days = Math.floor((new Date(l.date_fin).getTime() - Date.now()) / 86400000)
    return days <= 30
  })
  const expirees = licences.filter(l => l.is_active && l.date_fin < today)
  const disponibles = licences.filter(l => !l.ecole_id && l.is_active && l.date_fin >= today)
  const revenu = actives.reduce((s, l) => s + (PLAN_PRICES[l.type] || 0), 0)

  const planStats = PLANS.map(p => ({
    plan: p,
    count: actives.filter(l => l.type === p).length,
    revenu: actives.filter(l => l.type === p).reduce((s) => s + (PLAN_PRICES[p] || 0), 0),
  })).filter(p => p.count > 0)

  const expirantSoon = [...licences]
    .filter(l => l.is_active && l.date_fin >= today)
    .sort((a, b) => a.date_fin.localeCompare(b.date_fin))
    .slice(0, 5)

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <Header onLogout={handleLogout} />
      <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Vue globale</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Pilotage commercial et opérationnel</p>
        </div>

        {loading ? (
          <p style={{ color: '#64748b' }}>Chargement...</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              <StatCard label="Licences actives" value={actives.length} />
              <StatCard label="Clés disponibles" value={disponibles.length} sub="En attente d'activation" />
              <StatCard label="Expirent sous 30j" value={expirant.length} color={expirant.length > 0 ? '#f59e0b' : '#e2e8f0'} />
              <StatCard label="Licences expirées" value={expirees.length} color={expirees.length > 0 ? '#ef4444' : '#e2e8f0'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
              <StatCard label="Chiffre d'affaires" value={revenu.toLocaleString('fr-FR') + ' FCFA'} color="#10b981" />
              <StatCard label="Total licences" value={licences.length} />
              <StatCard label="Révoquées" value={licences.filter(l => !l.is_active).length} />
              <StatCard label="Revenu moyen/licence" value={actives.length > 0 ? Math.round(revenu / actives.length).toLocaleString('fr-FR') + ' FCFA' : '—'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Répartition par plan */}
              <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Répartition par plan</h2>
                </div>
                {planStats.length === 0 ? (
                  <p style={{ padding: 20, color: '#64748b', fontSize: 13 }}>Aucune licence active</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155' }}>
                        {['Plan', 'Licences actives', 'Revenu estimé'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {planStats.map(p => (
                        <tr key={p.plan} style={{ borderBottom: '1px solid #0f172a' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <Badge color={PLAN_COLOR[p.plan] || '#64748b'}>{p.plan.charAt(0).toUpperCase() + p.plan.slice(1)}</Badge>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#cbd5e1', fontSize: 14 }}>{p.count}</td>
                          <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 600, fontSize: 14 }}>{p.revenu.toLocaleString('fr-FR')} FCFA</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Expirations à venir */}
              <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155' }}>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', margin: 0 }}>Prochaines expirations</h2>
                </div>
                {expirantSoon.length === 0 ? (
                  <p style={{ padding: 20, color: '#64748b', fontSize: 13 }}>Aucune expiration à venir</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155' }}>
                        {['Clé', 'Plan', 'Expire le'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {expirantSoon.map(l => {
                        const days = Math.floor((new Date(l.date_fin).getTime() - Date.now()) / 86400000)
                        return (
                          <tr key={l.id} style={{ borderBottom: '1px solid #0f172a' }}>
                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{l.cle_licence.slice(0, 20)}…</td>
                            <td style={{ padding: '12px 16px' }}>
                              <Badge color={PLAN_COLOR[l.type] || '#64748b'}>{l.type}</Badge>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 13, color: days <= 30 ? '#f59e0b' : '#94a3b8', fontWeight: days <= 30 ? 600 : 400 }}>
                              {l.date_fin} {days <= 30 && `(${days}j)`}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
