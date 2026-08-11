'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, KeyRound } from 'lucide-react'
import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { AuthInput } from '@/components/auth/auth-input'
import { AuthButton } from '@/components/auth/auth-button'
import { AuthError } from '@/components/auth/auth-error'
import { WhatsAppSupportLink } from '@/components/auth/whatsapp-support-link'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        recovery_code: recoveryCode,
        new_password: newPassword,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Réinitialisation impossible')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <AuthSplitLayout
      mode="recover"
      title="Mot de passe oublié"
      subtitle="Utilisez le code de secours reçu lors de la création de votre compte."
      footer={
        <>
          <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
            Retour à la connexion
          </Link>
        </>
      }
    >
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center">
          <p className="text-sm font-semibold text-emerald-800">Mot de passe mis à jour</p>
          <p className="mt-1 text-[13px] text-emerald-700">Redirection vers la connexion…</p>
        </div>
      ) : (
        <>
          <AuthError message={error} />

          <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] leading-relaxed text-blue-800">
            Le code ressemble à <strong className="font-mono">SM-XXXX-XXXX</strong>.
            Il vous a été montré une seule fois à l&apos;inscription.
          </div>

          <div className="space-y-5">
            <AuthInput
              id="email"
              label="Email du compte"
              icon={Mail}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="directeur@ecole.cm"
              autoComplete="email"
            />
            <AuthInput
              id="recovery"
              label="Code de secours"
              icon={KeyRound}
              value={recoveryCode}
              onChange={v => setRecoveryCode(v.toUpperCase())}
              placeholder="SM-XXXX-XXXX"
              mono
            />
            <AuthInput
              id="new_password"
              label="Nouveau mot de passe"
              icon={Lock}
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              hint="8 caractères minimum."
              minLength={8}
              autoComplete="new-password"
            />
            <AuthButton
              onClick={handleSubmit}
              disabled={!email || !recoveryCode || newPassword.length < 8}
              loading={loading}
            >
              Réinitialiser le mot de passe
            </AuthButton>

            <WhatsAppSupportLink
              hint="Code perdu ? Contactez le support"
              message="Bonjour, j'ai perdu mon code de secours SchoolManager."
            />
          </div>
        </>
      )}
    </AuthSplitLayout>
  )
}
