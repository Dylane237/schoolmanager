'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { Mail, Lock } from 'lucide-react'
import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { AuthInput } from '@/components/auth/auth-input'
import { AuthButton } from '@/components/auth/auth-button'
import { AuthError } from '@/components/auth/auth-error'
import { WhatsAppSupportLink } from '@/components/auth/whatsapp-support-link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e?: FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    })

    const data = await res.json()

    if (!res.ok) {
      if (res.status === 403) {
        if (data.error?.includes('autre ordinateur')) {
          setError(data.error)
          setLoading(false)
          return
        }
        window.location.href = '/licence-expiree'
        return
      }
      setError(data.error || 'Erreur de connexion')
      setLoading(false)
      return
    }

    const { user } = data

    if (user.role === 'super_admin') {
      window.location.href = '/super-admin/dashboard'
    } else if (user.ecole_slug) {
      window.location.href = `/${user.ecole_slug}/dashboard`
    } else {
      setError('Aucune école associée à ce compte.')
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      mode="login"
      title="Bon retour"
      subtitle="Connectez-vous pour gérer les tranches, les élèves et les reçus de votre école."
      footer={
        <>
          Pas encore de compte ?{' '}
          <Link href="/register" className="font-medium text-emerald-600 transition-colors hover:text-emerald-700">
            Créer mon école
          </Link>
        </>
      }
    >
      <AuthError message={error} />

      <form onSubmit={handleLogin} className="space-y-5">
        <AuthInput
          id="email"
          label="Adresse email"
          icon={Mail}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="directeur@ecole.cm"
          autoComplete="email"
        />
        <div>
          <AuthInput
            id="password"
            label="Mot de passe"
            icon={Lock}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Votre mot de passe"
            autoComplete="current-password"
          />
          <div className="mt-2 text-right">
            <Link
              href="/mot-de-passe-oublie"
              className="text-[12px] font-medium text-emerald-600 hover:text-emerald-700"
            >
              Mot de passe oublié ?
            </Link>
          </div>
        </div>
        <AuthButton
          type="submit"
          disabled={!email || !password}
          loading={loading}
        >
          Se connecter
        </AuthButton>

        <WhatsAppSupportLink />
      </form>
    </AuthSplitLayout>
  )
}
