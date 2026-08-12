'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Mail, Lock, KeyRound, Building2, User, Phone, Check } from 'lucide-react'
import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { AuthInput } from '@/components/auth/auth-input'
import { AuthButton } from '@/components/auth/auth-button'
import { AuthStepper } from '@/components/auth/auth-stepper'
import { AuthStepContent } from '@/components/auth/auth-step-content'
import { AuthError } from '@/components/auth/auth-error'
import { RecoveryCodeReveal } from '@/components/auth/recovery-code-reveal'
import type { Section } from '@/types'

const SECTION_IDS: Section[] = ['francophone', 'anglophone', 'maternelle']

export default function RegisterPage() {
  const router = useRouter()
  const t = useTranslations('auth.register')
  const tAuth = useTranslations('auth')
  const tc = useTranslations('common')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [licenceInfo, setLicenceInfo] = useState<{ valid: boolean; message?: string; plan?: string } | null>(null)
  const [verifyingLicence, setVerifyingLicence] = useState(false)
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)

  const sections = SECTION_IDS.map(id => ({
    id,
    label: t(`sections.${id}.label`),
    desc: t(`sections.${id}.desc`),
  }))

  const [form, setForm] = useState({
    email: '',
    password: '',
    nom_ecole: '',
    telephone: '',
    directeur_nom: '',
    sections: ['francophone'] as Section[],
    cle_licence: '',
    code_parrain: '',
  })

  function updateField(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleSection(section: Section) {
    setForm(prev => ({
      ...prev,
      sections: prev.sections.includes(section)
        ? prev.sections.filter(s => s !== section)
        : [...prev.sections, section],
    }))
  }

  function goToStep(next: number) {
    setError('')
    setStep(next)
  }

  async function verifyLicence() {
    if (!form.cle_licence.trim()) {
      setLicenceInfo(null)
      return
    }
    setVerifyingLicence(true)
    const res = await fetch(`/api/auth/verify-licence?cle=${encodeURIComponent(form.cle_licence.trim())}`)
    const data = await res.json()
    setLicenceInfo(data.valid
      ? { valid: true, message: data.message, plan: data.plan }
      : { valid: false, message: data.error || t('errors.invalidKey') })
    setVerifyingLicence(false)
  }

  async function handleContinueStep1() {
    if (!form.cle_licence.trim()) return
    setVerifyingLicence(true)
    const res = await fetch(`/api/auth/verify-licence?cle=${encodeURIComponent(form.cle_licence.trim())}`)
    const data = await res.json()
    setLicenceInfo(data.valid
      ? { valid: true, message: data.message, plan: data.plan }
      : { valid: false, message: data.error || t('errors.invalidKey') })
    setVerifyingLicence(false)
    if (!data.valid) {
      setError(data.error || t('errors.invalidLicenceKey'))
      return
    }
    goToStep(2)
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
      credentials: 'include',
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || t('errors.createFailed'))
      setLoading(false)
      return
    }

    setRecoveryCode(data.recovery_code)
    setCreatedSlug(data.slug)
    setStep(4)
    setLoading(false)
  }

  const step1Valid = form.email && form.password.length >= 8 && form.cle_licence
  const step2Valid = form.nom_ecole && form.directeur_nom

  const registerFooter = (
    <>
      {t('alreadyRegistered')}{' '}
      <Link href="/login" className="font-medium text-emerald-600 hover:text-emerald-700">
        {tAuth('signInLink')}
      </Link>
    </>
  )

  if (step === 4 && recoveryCode && createdSlug) {
    return (
      <AuthSplitLayout
        mode="register"
        title={t('step4.title')}
        subtitle={t('step4.subtitle')}
        footer={registerFooter}
      >
        <RecoveryCodeReveal
          code={recoveryCode}
          onContinue={() => router.push(`/${createdSlug}/dashboard`)}
        />
      </AuthSplitLayout>
    )
  }

  return (
    <AuthSplitLayout
      mode="register"
      title={t('title')}
      subtitle={t('subtitle')}
      footer={registerFooter}
    >
      <AuthStepper step={step} />

      <AuthError message={error} />

      {step === 1 && (
        <AuthStepContent stepKey={1}>
          <div className="space-y-5">
            <AuthInput
              id="email"
              label={t('step1.emailLabel')}
              icon={Mail}
              type="email"
              value={form.email}
              onChange={v => updateField('email', v)}
              placeholder={tAuth('emailPlaceholder')}
              autoComplete="email"
            />
            <AuthInput
              id="password"
              label={tAuth('password')}
              icon={Lock}
              type="password"
              value={form.password}
              onChange={v => updateField('password', v)}
              hint={t('step1.passwordHint')}
              minLength={8}
              autoComplete="new-password"
            />
            <AuthInput
              id="cle"
              label={t('step1.licenceKeyLabel')}
              icon={KeyRound}
              value={form.cle_licence}
              onChange={v => {
                updateField('cle_licence', v.toUpperCase())
                setLicenceInfo(null)
              }}
              onBlur={verifyLicence}
              placeholder={t('step1.licenceKeyPlaceholder')}
              hint={t('step1.licenceKeyHint')}
              mono
            />
            {licenceInfo && (
              <p className={`text-xs -mt-3 ${licenceInfo.valid ? 'text-emerald-600' : 'text-red-600'}`}>
                {licenceInfo.message}
              </p>
            )}
            <AuthInput
              id="code_parrain"
              label={t('step1.referralLabel')}
              icon={KeyRound}
              value={form.code_parrain}
              onChange={v => updateField('code_parrain', v.toUpperCase())}
              placeholder={t('step1.referralPlaceholder')}
              hint={t('step1.referralHint')}
              mono
            />
            {verifyingLicence && (
              <p className="text-xs text-gray-500 -mt-3">{t('step1.verifying')}</p>
            )}
            <AuthButton disabled={!step1Valid || verifyingLicence} onClick={handleContinueStep1}>
              {t('step1.continue')}
            </AuthButton>
          </div>
        </AuthStepContent>
      )}

      {step === 2 && (
        <AuthStepContent stepKey={2}>
          <div className="space-y-5">
            <AuthInput
              id="nom_ecole"
              label={t('step2.schoolNameLabel')}
              icon={Building2}
              value={form.nom_ecole}
              onChange={v => updateField('nom_ecole', v)}
              placeholder={t('step2.schoolNamePlaceholder')}
            />
            <AuthInput
              id="directeur"
              label={t('step2.directorLabel')}
              icon={User}
              value={form.directeur_nom}
              onChange={v => updateField('directeur_nom', v)}
              placeholder={t('step2.directorPlaceholder')}
            />
            <AuthInput
              id="telephone"
              label={t('step2.phoneLabel')}
              icon={Phone}
              type="tel"
              value={form.telephone}
              onChange={v => updateField('telephone', v)}
              placeholder={t('step2.phonePlaceholder')}
            />
            <div className="flex gap-3">
              <AuthButton variant="ghost" className="flex-1" onClick={() => goToStep(1)}>
                {tc('back')}
              </AuthButton>
              <AuthButton className="flex-1" disabled={!step2Valid} onClick={() => goToStep(3)}>
                {t('step1.continue')}
              </AuthButton>
            </div>
          </div>
        </AuthStepContent>
      )}

      {step === 3 && (
        <AuthStepContent stepKey={3}>
          <form onSubmit={handleRegister} className="space-y-5">
            <p className="text-[13px] text-gray-600">{t('step3.sectionsPrompt')}</p>
            <div className="space-y-2.5">
              {sections.map(opt => {
                const selected = form.sections.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleSection(opt.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.99] ${
                      selected
                        ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                        selected
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                      <p className="text-[12px] text-gray-500">{opt.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3 pt-1">
              <AuthButton type="button" variant="ghost" className="flex-1" onClick={() => goToStep(2)}>
                {tc('back')}
              </AuthButton>
              <AuthButton type="submit" className="flex-1" disabled={form.sections.length === 0} loading={loading}>
                {loading ? t('step3.creating') : t('step3.submit')}
              </AuthButton>
            </div>
          </form>
        </AuthStepContent>
      )}
    </AuthSplitLayout>
  )
}
