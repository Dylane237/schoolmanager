'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Mail, Lock } from 'lucide-react'
import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { AuthInput } from '@/components/auth/auth-input'
import { AuthButton } from '@/components/auth/auth-button'
import { AuthError } from '@/components/auth/auth-error'
import { WhatsAppSupportLink } from '@/components/auth/whatsapp-support-link'
import { getLastLoginEmail, setLastLoginEmail } from '@/lib/last-login-email'

export default function LoginPage() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = getLastLoginEmail()
    if (saved) setEmail(saved)
  }, [])

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
        if (data.error?.includes('Licence expirée')) {
          window.location.href = '/licence-expiree'
          return
        }
      }
      setError(data.error || t('loginError'))
      setLoading(false)
      return
    }

    setLastLoginEmail(email)

    const { user } = data

    if (user.role === 'super_admin') {
      window.location.href = '/super-admin/dashboard'
    } else if (user.ecole_slug) {
      window.location.href = `/${user.ecole_slug}/dashboard`
    } else {
      setError(t('noSchool'))
      setLoading(false)
    }
  }

  return (
    <AuthSplitLayout
      mode="login"
      title={t('loginTitle')}
      subtitle={t('loginSubtitle')}
      footer={
        <>
          {t('noAccount')}{' '}
          <Link href="/register" className="font-medium text-emerald-600 transition-colors hover:text-emerald-700">
            {t('registerLink')}
          </Link>
          <span className="mt-3 block text-[12px] text-gray-400">
            <Link href="/telecharger" className="hover:text-emerald-600">{t('downloadApp')}</Link>
            {' · '}
            <Link href="/" className="hover:text-emerald-600">{t('backHome')}</Link>
          </span>
        </>
      }
    >
      <AuthError message={error} />

      <form onSubmit={handleLogin} className="space-y-5">
        <AuthInput
          id="email"
          label={t('email')}
          icon={Mail}
          type="email"
          value={email}
          onChange={setEmail}
          placeholder={t('emailPlaceholder')}
          autoComplete="email"
        />
        <div>
          <AuthInput
            id="password"
            label={t('password')}
            icon={Lock}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={t('passwordPlaceholder')}
            autoComplete="current-password"
          />
          <div className="mt-2 text-right">
            <Link
              href="/mot-de-passe-oublie"
              className="text-[12px] font-medium text-emerald-600 hover:text-emerald-700"
            >
              {t('forgotPasswordLink')}
            </Link>
          </div>
        </div>
        <AuthButton
          type="submit"
          disabled={!email || !password}
          loading={loading}
        >
          {t('submitLogin')}
        </AuthButton>

        <WhatsAppSupportLink />
      </form>
    </AuthSplitLayout>
  )
}
