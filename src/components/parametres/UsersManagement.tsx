'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, Users, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'

interface SchoolUser {
  id: string
  email: string
  nom: string
  prenom: string | null
  role: string
  telephone: string | null
  created_at: string
}

const ROLE_VARIANT: Record<string, 'info' | 'success' | 'warning' | 'neutral'> = {
  admin: 'info',
  secretaire: 'success',
  comptable: 'warning',
  enseignant: 'neutral',
}

export default function UsersManagement() {
  const t = useTranslations('parametres.usersManagement')
  const [users, setUsers] = useState<SchoolUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    email: '', password: '', nom: '', prenom: '', role: 'secretaire', telephone: '',
  })

  const roleLabel = (role: string) => {
    const key = role as 'admin' | 'secretaire' | 'comptable' | 'enseignant'
    return t(`roles.${key}`, { defaultValue: role })
  }

  const fetchUsers = async () => {
    setLoading(true)
    const res = await fetch('/api/users')
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.nom) return
    setSaving(true)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || t('toasts.error'))
      setSaving(false)
      return
    }
    toast.success(t('toasts.created'))
    setShowForm(false)
    setForm({ email: '', password: '', nom: '', prenom: '', role: 'secretaire', telephone: '' })
    fetchUsers()
    setSaving(false)
  }

  const handleDelete = async (id: string, nom: string) => {
    if (!confirm(t('deleteConfirm', { name: nom }))) return
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || t('toasts.error'))
      return
    }
    toast.success(t('toasts.deleted'))
    fetchUsers()
  }

  const columns = [t('columns.user'), t('columns.email'), t('columns.role'), '']

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-500" />
          {t('title')}
        </h2>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 py-2 text-sm">
          <Plus className="w-4 h-4" /> {t('newAccount')}
        </button>
      </div>

      <p className="text-sm text-slate-500 flex items-start gap-2">
        <Shield className="w-4 h-4 mt-0.5 shrink-0" />
        {t('hint')}
      </p>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={t('modalTitle')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('fields.lastName')}</label>
              <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('fields.firstName')}</label>
              <input value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('fields.email')}</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('fields.password')}</label>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('fields.role')}</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="input-field">
                <option value="secretaire">{t('roles.secretaireDesc')}</option>
                <option value="comptable">{t('roles.comptableDesc')}</option>
                <option value="enseignant">{t('roles.enseignantDesc')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('fields.phone')}</label>
              <input value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} className="input-field" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving || !form.email || !form.password || !form.nom} className="w-full btn-primary">
            {saving ? t('creating') : t('create')}
          </button>
        </div>
      </Modal>

      {loading ? (
        <p className="text-slate-400 text-center py-6">{t('loading')}</p>
      ) : users.length === 0 ? (
        <p className="text-slate-400 text-center py-6">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {columns.map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {u.nom}{u.prenom ? ` ${u.prenom}` : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_VARIANT[u.role] ?? 'neutral'} size="sm">
                      {roleLabel(u.role)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleDelete(u.id, u.nom)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
