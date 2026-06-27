'use client'

import { useState, useEffect } from 'react'

type Licence = {
  id: string
  cle_licence: string
  type: string
  date_debut: string
  date_fin: string
  is_active: number
  created_at: string
}

const PLANS = ['starter', 'standard', 'premium']

export default function AdminLicencesPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [licences, setLicences] = useState<Licence[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ plan: 'standard', date_fin: '' })
  const [message, setMessage] = useState('')

  const handleLogin = async () => {
    const res = await fetch('/api/admin-licences/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      setAuthed(true)
      loadLicences()
    } else {
      setLoginError('Mot de passe incorrect')
    }
  }

  const loadLicences = async () => {
    setLoading(true)
    const res = await fetch('/api/admin-licences/list')
    const data = await res.json()
    setLicences(data.licences || [])
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!form.date_fin) return
    setMessage('')
    const res = await fetch('/api/admin-licences/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      setMessage(`✅ Clé créée : ${data.cle}`)
      loadLicences()
    } else {
      setMessage(`❌ Erreur : ${data.error}`)
    }
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

  useEffect(() => {
    // Vérifier si déjà auth via cookie
    fetch('/api/admin-licences/list').then(r => {
      if (r.ok) { setAuthed(true); r.json().then(d => setLicences(d.licences || [])) }
    })
  }, [])

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ background: '#1e293b', padding: 32, borderRadius: 16, width: 320 }}>
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 24 }}>🔐 Admin Licences</h1>
          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', marginBottom: 12, boxSizing: 'border-box' }}
          />
          {loginError && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 8 }}>{loginError}</p>}
          <button
            onClick={handleLogin}
            style={{ width: '100%', padding: '10px 0', background: '#10b981', color: '#fff', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
          >
            Connexion
          </button>
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#fff', padding: 24 }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>🔑 Gestion des licences</h1>

        {/* Formulaire création */}
        <div style={{ background: '#1e293b', padding: 24, borderRadius: 12, marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#94a3b8' }}>Nouvelle licence</h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Plan</label>
              <select
                value={form.plan}
                onChange={e => setForm({ ...form, plan: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
              >
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Date de fin</label>
              <input
                type="date"
                value={form.date_fin}
                onChange={e => setForm({ ...form, date_fin: e.target.value })}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
              />
            </div>
            <button
              onClick={handleCreate}
              style={{ padding: '8px 20px', background: '#10b981', color: '#fff', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Générer
            </button>
          </div>
          {message && (
            <p style={{ marginTop: 12, padding: '8px 12px', background: '#0f172a', borderRadius: 8, fontFamily: 'monospace', fontSize: 13 }}>
              {message}
            </p>
          )}
        </div>

        {/* Liste des licences */}
        <div style={{ background: '#1e293b', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#94a3b8' }}>
              Licences ({licences.length})
            </h2>
          </div>
          {loading ? (
            <p style={{ padding: 20, color: '#94a3b8' }}>Chargement...</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['Clé', 'Plan', 'Début', 'Fin', 'Statut', 'Action'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {licences.map(l => {
                    const expired = l.date_fin < today
                    const active = l.is_active === 1
                    const status = !active ? '🔴 Révoquée' : expired ? '🟡 Expirée' : '🟢 Active'
                    return (
                      <tr key={l.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0' }}>{l.cle_licence}</td>
                        <td style={{ padding: '12px 16px', textTransform: 'capitalize', color: '#94a3b8' }}>{l.type}</td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13 }}>{l.date_debut}</td>
                        <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 13 }}>{l.date_fin}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{status}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {active && (
                            <button
                              onClick={() => handleRevoke(l.id)}
                              style={{ padding: '4px 12px', background: '#dc2626', color: '#fff', borderRadius: 6, border: 'none', fontSize: 12, cursor: 'pointer' }}
                            >
                              Révoquer
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
