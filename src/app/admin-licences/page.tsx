'use client'

import { useState, useEffect, useCallback } from 'react'

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

const PLAN_COLORS: Record<string, string> = {
  starter: '#6366f1',
  standard: '#3b82f6',
  premium: '#10b981',
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 999,
      fontSize: 12, fontWeight: 600,
      background: color + '22', color,
      border: `1px solid ${color}44`,
    }}>{children}</span>
  )
}

function StatusBadge({ licence }: { licence: Licence }) {
  const today = new Date().toISOString().split('T')[0]
  if (!licence.is_active) return <Badge color="#ef4444">Révoquée</Badge>
  if (licence.date_fin < today) return <Badge color="#f59e0b">Expirée</Badge>
  return <Badge color="#10b981">Active</Badge>
}

export default function AdminLicencesPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [licences, setLicences] = useState<Licence[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'toutes' | 'disponibles' | 'attribuees'>('toutes')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ plan: 'standard', date_fin: '' })
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [copied, setCopied] = useState('')

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
    })
  }, [])

  const handleLogin = async () => {
    const res = await fetch('/api/admin-licences/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) { setAuthed(true); loadLicences() }
    else setLoginError('Mot de passe incorrect')
  }

  const handleCreate = async () => {
    if (!form.date_fin) return
    setCreating(true)
    setNewKey('')
    const res = await fetch('/api/admin-licences/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) { setNewKey(data.cle); loadLicences() }
    setCreating(false)
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Révoquer cette licence ?')) return
    await fetch('/api/admin-licences/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadLicences()
  }

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const today = new Date().toISOString().split('T')[0]

  const filtered = licences.filter(l => {
    if (filter === 'disponibles') return !l.ecole_id
    if (filter === 'attribuees') return !!l.ecole_id
    return true
  })

  const actives = licences.filter(l => l.is_active && l.date_fin >= today).length
  const disponibles = licences.filter(l => !l.ecole_id && l.is_active && l.date_fin >= today).length

  const s: Record<string, React.CSSProperties> = {
    root: { minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    header: { background: '#1e293b', borderBottom: '1px solid #334155', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    logo: { display: 'flex', alignItems: 'center', gap: 10 },
    logoIcon: { width: 32, height: 32, background: '#10b981', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' },
    logoText: { fontWeight: 700, fontSize: 15, color: '#fff' },
    logoSub: { color: '#64748b', fontSize: 13, marginLeft: 6 },
    nav: { display: 'flex', alignItems: 'center', gap: 4 },
    navActive: { padding: '6px 14px', borderRadius: 8, background: '#334155', color: '#fff', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' },
    navItem: { padding: '6px 14px', borderRadius: 8, background: 'transparent', color: '#94a3b8', fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer' },
    body: { padding: '32px 40px', maxWidth: 1100, margin: '0 auto' },
    pageTitle: { fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 },
    pageSub: { fontSize: 13, color: '#64748b', marginTop: 4 },
    row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#10b981', color: '#fff', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    card: { background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' },
    filterRow: { display: 'flex', gap: 6, marginBottom: 16 },
    filterBtn: (active: boolean): React.CSSProperties => ({ padding: '5px 14px', borderRadius: 999, fontSize: 13, fontWeight: 500, border: '1px solid', cursor: 'pointer', background: active ? '#334155' : 'transparent', color: active ? '#e2e8f0' : '#64748b', borderColor: active ? '#475569' : '#334155' }),
    table: { width: '100%', borderCollapse: 'collapse' as const },
    th: { padding: '12px 16px', textAlign: 'left' as const, fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '1px solid #334155', background: '#0f172a44' },
    td: { padding: '13px 16px', fontSize: 13, color: '#cbd5e1', borderBottom: '1px solid #1e293b' },
    mono: { fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0' },
    copyBtn: { background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, fontSize: 12, marginLeft: 4 },
    revokeBtn: { padding: '4px 10px', background: 'transparent', color: '#ef4444', border: '1px solid #ef444444', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 500 },
    modal: { position: 'fixed' as const, inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    modalBox: { background: '#1e293b', borderRadius: 14, border: '1px solid #334155', padding: 28, width: 420 },
    label: { fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6, fontWeight: 500 },
    input: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' as const, outline: 'none' },
    select: { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' as const },
    successBox: { background: '#10b98122', border: '1px solid #10b98144', borderRadius: 8, padding: '10px 14px', marginTop: 14 },
    poolBadge: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: '#7c3aed22', color: '#a78bfa', border: '1px solid #7c3aed44' },
  }

  if (!authed) {
    return (
      <div style={{ ...s.root, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#1e293b', borderRadius: 14, border: '1px solid #334155', padding: 32, width: 340 }}>
          <div style={{ ...s.logo, marginBottom: 24 }}>
            <div style={s.logoIcon}>S</div>
            <div>
              <span style={s.logoText}>SchoolManager</span>
              <span style={s.logoSub}>Administration</span>
            </div>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>Connectez-vous pour gérer les licences.</p>
          <div style={{ marginBottom: 12 }}>
            <label style={s.label}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={s.input}
              placeholder="••••••••"
            />
          </div>
          {loginError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 8 }}>{loginError}</p>}
          <button onClick={handleLogin} style={{ ...s.btnPrimary, width: '100%', justifyContent: 'center', marginTop: 8 }}>
            Se connecter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={s.root}>
      <header style={s.header}>
        <div style={s.logo}>
          <div style={s.logoIcon}>S</div>
          <div>
            <span style={s.logoText}>SchoolManager</span>
            <span style={s.logoSub}>Administration éditeur</span>
          </div>
        </div>
        <nav style={s.nav}>
          <button style={s.navActive}>Licences</button>
        </nav>
      </header>

      <div style={s.body}>
        <div style={s.row}>
          <div>
            <h1 style={s.pageTitle}>Licences</h1>
            <p style={s.pageSub}>{disponibles} clé(s) disponible(s) · {actives} licence(s) active(s)</p>
          </div>
          <button style={s.btnPrimary} onClick={() => { setShowForm(true); setNewKey('') }}>
            + Clé d'activation
          </button>
        </div>

        <div style={s.card}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155', background: '#0f172a22' }}>
            <div style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
              <span style={{ color: '#3b82f6', fontWeight: 600 }}>Flux offline</span>
              {' '}— Générez une <span style={{ color: '#10b981', fontWeight: 600 }}>clé d'activation</span> (sans école) et remettez-la au directeur. Lors de l'inscription sur <code style={{ background: '#1e293b', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>/register</code>, la clé active son école localement.
            </div>
          </div>

          <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155' }}>
            <div style={s.filterRow}>
              {(['toutes', 'disponibles', 'attribuees'] as const).map(f => (
                <button key={f} style={s.filterBtn(filter === f)} onClick={() => setFilter(f)}>
                  {f === 'toutes' ? 'Toutes' : f === 'disponibles' ? 'Disponibles' : 'Attribuées'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#64748b', fontSize: 14 }}>Chargement...</div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  {['École', 'Clé', 'Plan', 'Statut', 'Expiration', 'Actions'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center', color: '#64748b', padding: 32 }}>Aucune licence</td></tr>
                ) : filtered.map(l => (
                  <tr key={l.id} style={{ background: 'transparent' }}>
                    <td style={s.td}>
                      {l.ecole_id ? (
                        <span style={{ color: '#e2e8f0', fontWeight: 500 }}>—</span>
                      ) : (
                        <span style={s.poolBadge}>En attente d'activation</span>
                      )}
                    </td>
                    <td style={s.td}>
                      <span style={s.mono}>{l.cle_licence}</span>
                      <button style={s.copyBtn} onClick={() => copyKey(l.cle_licence)} title="Copier">
                        {copied === l.cle_licence ? '✓' : '⧉'}
                      </button>
                    </td>
                    <td style={s.td}>
                      <Badge color={PLAN_COLORS[l.type] || '#64748b'}>
                        {l.type.charAt(0).toUpperCase() + l.type.slice(1)}
                      </Badge>
                    </td>
                    <td style={s.td}><StatusBadge licence={l} /></td>
                    <td style={{ ...s.td, color: '#94a3b8' }}>{l.date_fin}</td>
                    <td style={s.td}>
                      {!!l.is_active && (
                        <button style={s.revokeBtn} onClick={() => handleRevoke(l.id)}>
                          Révoquer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div style={s.modalBox}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>Nouvelle clé d'activation</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Plan</label>
              <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} style={s.select}>
                {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={s.label}>Date de fin</label>
              <input type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} style={s.input} />
            </div>

            {newKey && (
              <div style={s.successBox}>
                <p style={{ fontSize: 12, color: '#10b981', marginBottom: 6, fontWeight: 600 }}>Clé générée</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ ...s.mono, flex: 1, wordBreak: 'break-all' as const }}>{newKey}</code>
                  <button style={{ ...s.copyBtn, color: '#10b981' }} onClick={() => copyKey(newKey)}>
                    {copied === newKey ? '✓' : '⧉'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowForm(false)} style={{ ...s.navItem, border: '1px solid #334155', flex: 1, textAlign: 'center' as const }}>
                Fermer
              </button>
              <button onClick={handleCreate} disabled={creating || !form.date_fin} style={{ ...s.btnPrimary, flex: 1, justifyContent: 'center', opacity: creating || !form.date_fin ? 0.6 : 1 }}>
                {creating ? 'Génération...' : 'Générer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}