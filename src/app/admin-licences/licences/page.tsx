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
    setLoading(true)
    const res = await fetch('/api/admin-licences/list')
    if (res.ok) { const data = await res.json(); setLicences(data.licences || []) }
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
  }

  const handleCreate = async () => {
    if (!form.date_fin) return
    setCreating(true); setNewKey('')
    const res = await fetch('/api/admin-licences/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (res.ok) { setNewKey(data.cle); loadLicences() }
    setCreating(false)
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Révoquer cette licence ?')) return
    await fetch('/api/admin-licences/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadLicences()
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const today = new Date().toISOString().split('T')[0]
  const actives = licences.filter(l => l.is_active && l.date_fin >= today).length
  const disponibles = licences.filter(l => !l.ecoles && l.is_active && l.date_fin >= today).length

  const filtered = licences.filter(l => {
    if (filter === 'disponibles' && l.ecoles) return false
    if (filter === 'attribuees' && !l.ecoles) return false
    if (search && !l.cle_licence.toLowerCase().includes(search.toLowerCase()) && !l.type.includes(search.toLowerCase())) return false
    return true
  })

  if (checking) return <div style={{ minHeight: '100vh', background: '#0f172a' }} />
  if (!authed) return <LoginScreen onAuth={() => { setAuthed(true); loadLicences() }} />

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <Header onLogout={handleLogout} />
      <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Licences</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{disponibles} clé(s) disponible(s) · {actives} licence(s) active(s)</p>
          </div>
          <button onClick={() => { setShowForm(true); setNewKey('') }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#10b981', color: '#fff', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            + Clé d'activation
          </button>
        </div>

        <div style={{ background: '#1e3a5f', border: '1px solid #1d4ed844', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#93c5fd', lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600, color: '#60a5fa' }}>Flux offline</span> — Générez une <span style={{ fontWeight: 600 }}>clé d'activation</span> (sans école) et remettez-la au directeur sur clé USB ou papier. Lors de l'inscription sur <code style={{ background: '#0f172a', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>/register</code>, la clé active son école localement.
        </div>

        <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['toutes', 'disponibles', 'attribuees'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{ padding: '5px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, border: '1px solid', cursor: 'pointer', background: filter === f ? '#334155' : 'transparent', color: filter === f ? '#e2e8f0' : '#64748b', borderColor: filter === f ? '#475569' : '#334155' }}>
                  {f === 'toutes' ? 'Toutes' : f === 'disponibles' ? 'Disponibles' : 'Attribuées'}
                </button>
              ))}
            </div>
            <input
              placeholder="Rechercher une clé..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13, outline: 'none', width: 220 }}
            />
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 14 }}>Chargement...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', background: '#0f172a44' }}>
                  {['École', 'Clé', 'Plan', 'Statut', 'Début', 'Expiration', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 13 }}>Aucune licence trouvée</td></tr>
                ) : filtered.map(l => {
                  const days = Math.floor((new Date(l.date_fin).getTime() - Date.now()) / 86400000)
                  const rowBg = !l.is_active ? '#ef444408' : days < 0 ? '#ef444408' : days <= 30 ? '#f59e0b08' : 'transparent'
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid #1e293b', background: rowBg }}>
                      <td style={{ padding: '13px 16px', fontSize: 13 }}>
                        {l.ecoles
                          ? <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{l.ecoles.nom}</span>
                          : <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: '#7c3aed22', color: '#a78bfa', border: '1px solid #7c3aed44' }}>En attente</span>
                        }
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0' }}>{l.cle_licence}</span>
                          <button onClick={() => copyKey(l.cle_licence)} title="Copier"
                            style={{ background: 'none', border: 'none', color: copied === l.cle_licence ? '#10b981' : '#475569', cursor: 'pointer', padding: '2px 4px', fontSize: 13 }}>
                            {copied === l.cle_licence ? '✓' : '⧉'}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <Badge color={PLAN_COLOR[l.type] || '#64748b'}>{l.type.charAt(0).toUpperCase() + l.type.slice(1)}</Badge>
                      </td>
                      <td style={{ padding: '13px 16px' }}><StatusBadge l={l} /></td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: '#64748b' }}>{l.date_debut}</td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: days <= 30 && !!l.is_active ? '#f59e0b' : '#94a3b8', fontWeight: days <= 30 && !!l.is_active ? 600 : 400 }}>{l.date_fin}</td>
                      <td style={{ padding: '13px 16px' }}>
                        {!!l.is_active && (
                          <button onClick={() => handleRevoke(l.id)}
                            style={{ padding: '4px 10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef444433', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                            Révoquer
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000099', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155', padding: 28, width: 420 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Nouvelle clé d'activation</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6, fontWeight: 500 }}>Plan</label>
              <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' }}>
                {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6, fontWeight: 500 }}>Date de fin</label>
              <input type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            {newKey && (
              <div style={{ background: '#10b98122', border: '1px solid #10b98144', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: '#10b981', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clé générée — à copier maintenant</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0', flex: 1, wordBreak: 'break-all' }}>{newKey}</code>
                  <button onClick={() => copyKey(newKey)}
                    style={{ background: 'none', border: 'none', color: copied === newKey ? '#10b981' : '#64748b', cursor: 'pointer', fontSize: 16 }}>
                    {copied === newKey ? '✓' : '⧉'}
                  </button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowForm(false)}
                style={{ flex: 1, padding: '9px 0', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                Fermer
              </button>
              <button onClick={handleCreate} disabled={creating || !form.date_fin}
                style={{ flex: 1, padding: '9px 0', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: creating || !form.date_fin ? 0.6 : 1 }}>
                {creating ? 'Génération...' : 'Générer la clé'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
