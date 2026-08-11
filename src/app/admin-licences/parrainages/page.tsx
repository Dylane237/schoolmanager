'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminLicencesShell, Badge, STATUT_COLORS, STATUT_LABELS } from '@/components/admin-licences/AdminShell'

type Parrainage = {
  id: string
  local_id: string | null
  parrain_code: string
  parrain_ecole_nom: string
  parrain_ecole_slug: string | null
  parrain_directeur_nom: string | null
  contact_nom: string
  contact_ecole: string | null
  contact_telephone: string
  notes: string | null
  statut: string
  montant_abonnement: number | null
  commission_pct: number
  commission_montant: number | null
  filleul_ecole_slug: string | null
  filleul_ecole_nom: string | null
  created_at: string
}

type Stats = {
  enCours: number
  actifs: number
  verses: number
  totalCommission: number
}

function EditModal({
  p,
  onClose,
  onSaved,
}: {
  p: Parrainage
  onClose: () => void
  onSaved: () => void
}) {
  const [statut, setStatut] = useState(p.statut)
  const [montant, setMontant] = useState(p.montant_abonnement?.toString() ?? '')
  const [commission, setCommission] = useState(p.commission_montant?.toString() ?? '')
  const [filleulNom, setFilleulNom] = useState(p.filleul_ecole_nom ?? p.contact_ecole ?? '')
  const [filleulSlug, setFilleulSlug] = useState(p.filleul_ecole_slug ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin-licences/parrainages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: p.id,
        statut,
        montant_abonnement: montant ? Number(montant) : null,
        commission_montant: commission ? Number(commission) : null,
        filleul_ecole_nom: filleulNom || null,
        filleul_ecole_slug: filleulSlug || null,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(data.error || 'Erreur')
      return
    }
    onSaved()
    onClose()
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#e2e8f0',
    fontSize: 14,
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ background: '#1e293b', borderRadius: 16, border: '1px solid #334155', padding: 28, width: '100%', maxWidth: 440 }}>
        <h3 style={{ color: '#fff', margin: '0 0 4px', fontSize: 17 }}>{p.contact_nom}</h3>
        <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 20px' }}>Parrain : {p.parrain_code} — {p.parrain_ecole_nom}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Statut</label>
            <select value={statut} onChange={e => setStatut(e.target.value)} style={inputStyle}>
              {Object.entries(STATUT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Montant abonnement (FCFA)</label>
            <input type="number" value={montant} onChange={e => setMontant(e.target.value)} style={inputStyle} placeholder="Ex: 350000" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Commission versée (FCFA) — 10 % auto si vide</label>
            <input type="number" value={commission} onChange={e => setCommission(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>École filleul (nom)</label>
            <input value={filleulNom} onChange={e => setFilleulNom(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>Slug filleul</label>
            <input value={filleulSlug} onChange={e => setFilleulSlug(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 0', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, cursor: 'pointer' }}>Annuler</button>
          <button type="button" onClick={save} disabled={saving} style={{ flex: 1, padding: '10px 0', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ParrainagesContent() {
  const [parrainages, setParrainages] = useState<Parrainage[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [edit, setEdit] = useState<Parrainage | null>(null)
  const [configError, setConfigError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const url = filter ? `/api/admin-licences/parrainages?statut=${filter}` : '/api/admin-licences/parrainages'
    const res = await fetch(url)
    const data = await res.json()
    if (res.status === 503) {
      setConfigError('Supabase non configuré sur Vercel — exécutez supabase/schema-cloud.sql')
      setLoading(false)
      return
    }
    if (res.ok) {
      setParrainages(data.parrainages ?? [])
      setStats(data.stats ?? null)
    }
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>Parrainages</h1>
        <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
          Leads synchronisés depuis les écoles + suivi des commissions 10 %.
        </p>
      </div>

      {configError && (
        <div style={{ background: '#451a1a', border: '1px solid #991b1b', borderRadius: 12, padding: 16, marginBottom: 20, color: '#fca5a5', fontSize: 14 }}>
          {configError}
        </div>
      )}

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'En cours', value: stats.enCours, color: '#94a3b8' },
            { label: 'Abonnements actifs', value: stats.actifs, color: '#10b981' },
            { label: 'Commissions versées', value: stats.verses, color: '#8b5cf6' },
            { label: 'Total FCFA versés', value: stats.totalCommission.toLocaleString('fr-FR'), color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: '16px 20px' }}>
              <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px' }}>{s.label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'en_cours', 'abonnement_actif', 'commission_versee', 'annule'].map(s => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setFilter(s)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid #334155',
              background: filter === s ? '#334155' : 'transparent',
              color: filter === s ? '#fff' : '#94a3b8',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {s ? STATUT_LABELS[s] : 'Tous'}
          </button>
        ))}
      </div>

      <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Chargement...</p>
        ) : parrainages.length === 0 ? (
          <p style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Aucun parrainage enregistré.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155' }}>
                  {['Parrain', 'Contact', 'Téléphone', 'Statut', 'Abonnement', 'Commission', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parrainages.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <p style={{ margin: 0, color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>{p.parrain_ecole_nom}</p>
                      <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>{p.parrain_code}</p>
                    </td>
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <p style={{ margin: 0, color: '#e2e8f0', fontSize: 14 }}>{p.contact_nom}</p>
                      {p.contact_ecole && <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 12 }}>{p.contact_ecole}</p>}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: 13, verticalAlign: 'top' }}>{p.contact_telephone}</td>
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <Badge color={STATUT_COLORS[p.statut] ?? '#64748b'}>{STATUT_LABELS[p.statut] ?? p.statut}</Badge>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#e2e8f0', fontSize: 13, verticalAlign: 'top', fontVariantNumeric: 'tabular-nums' }}>
                      {p.montant_abonnement != null ? `${Number(p.montant_abonnement).toLocaleString('fr-FR')} F` : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#a78bfa', fontSize: 13, verticalAlign: 'top', fontVariantNumeric: 'tabular-nums' }}>
                      {p.commission_montant != null ? `${Number(p.commission_montant).toLocaleString('fr-FR')} F` : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <button type="button" onClick={() => setEdit(p)} style={{ padding: '6px 12px', background: '#334155', color: '#e2e8f0', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                        Gérer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {edit && <EditModal p={edit} onClose={() => setEdit(null)} onSaved={load} />}
    </>
  )
}

export default function AdminParrainagesPage() {
  return (
    <AdminLicencesShell>
      <ParrainagesContent />
    </AdminLicencesShell>
  )
}
