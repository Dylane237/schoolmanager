'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Mail, Lock, KeyRound } from 'lucide-react'
import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { AuthInput } from '@/components/auth/auth-input'
import { AuthButton } from '@/components/auth/auth-button'
import { AuthError } from '@/components/auth/auth-error'
import { WhatsAppSupportLink } from '@/components/auth/whatsapp-support-link'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const t = useTranslations('auth.forgotPassword')
  const tAuth = useTranslations('auth')
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
      setError(data.error || t('errors.resetFailed'))
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
      title={t('title')}
      subtitle={t('subtitle')}
      footer={
        <>
          <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
            {t('backToLogin')}
          </Link>
        </>
      }
    >
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center">
          <p className="text-sm font-semibold text-emerald-800">{t('successTitle')}</p>
          <p className="mt-1 text-[13px] text-emerald-700">{t('successRedirect')}</p>
        </div>
      ) : (
        <>
          <AuthError message={error} />

          <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[13px] leading-relaxed text-blue-800">
            {t.rich('codeHint', {
              strong: chunks => <strong className="font-mono">{chunks}</strong>,
            })}
          </div>

          <div className="space-y-5">
            <AuthInput
              id="email"
              label={t('emailLabel')}
              icon={Mail}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder={tAuth('emailPlaceholder')}
              autoComplete="email"
            />
            <AuthInput
              id="recovery"
              label={t('recoveryCodeLabel')}
              icon={KeyRound}
              value={recoveryCode}
              onChange={v => setRecoveryCode(v.toUpperCase())}
              placeholder={t('recoveryCodePlaceholder')}
              mono
            />
            <AuthInput
              id="new_password"
              label={t('newPasswordLabel')}
              icon={Lock}
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              hint={t('newPasswordHint')}
              minLength={8}
              autoComplete="new-password"
            />
            <AuthButton
              onClick={handleSubmit}
              disabled={!email || !recoveryCode || newPassword.length < 8}
              loading={loading}
            >
              {t('submit')}
            </AuthButton>

            <WhatsAppSupportLink
              hint={t('supportHint')}
              message={t('supportMessage')}
            />
          </div>
        </>
      )}
    </AuthSplitLayout>
  )
}
