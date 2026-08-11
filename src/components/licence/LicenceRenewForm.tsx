'use client'

import { useState } from 'react'
import { Key, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LicenceRenewForm() {
  const router = useRouter()
  const [cle, setCle] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const key = cle.trim()
    if (!key) return

    setLoading(true)
    try {
      const res = await fetch('/api/licence/renew', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cle: key }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Activation échouée')
        return
      }
      toast.success('Licence activée — redirection...')
      router.refresh()
      window.location.href = '/'
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-white/10 space-y-3">
      <p className="text-sm text-slate-300 font-medium">Vous avez déjà reçu une nouvelle clé ?</p>
      <div className="flex gap-2">
        <input
          value={cle}
          onChange={e => setCle(e.target.value.toUpperCase())}
          placeholder="SM-XXXX-XXXX-XXXX"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 font-mono text-sm uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
        <button
          type="submit"
          disabled={loading || !cle.trim()}
          className="shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl px-5 py-3 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
          Activer
        </button>
      </div>
      <p className="text-xs text-slate-500">Réservé au directeur (compte admin connecté).</p>
    </form>
  )
}
