'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Mail, Lock, KeyRound, Building2, Link2, User, Phone, Check } from 'lucide-react'
import { AuthSplitLayout } from '@/components/auth/auth-split-layout'
import { AuthInput } from '@/components/auth/auth-input'
import { AuthButton } from '@/components/auth/auth-button'
import { AuthStepper } from '@/components/auth/auth-stepper'
import { AuthStepContent } from '@/components/auth/auth-step-content'
import { AuthError } from '@/components/auth/auth-error'
import { slugify } from '@/lib/utils/slug'
import type { Section } from '@/types'

const SECTIONS: { id: Section; label: string; desc: string }[] = [
  { id: 'francophone', label: 'Francophone', desc: 'SIL au CM2' },
  { id: 'anglophone', label: 'Anglophone', desc: 'Class 1 au Class 6' },
  { id: 'maternelle', label: 'Maternelle', desc: 'Petite, moyenne et grande section' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [licenceInfo, setLicenceInfo] = useState<{ valid: boolean; message?: string; plan?: string } | null>(null)
  const [verifyingLicence, setVerifyingLicence] = useState(false)

  const [form, setForm] = useState({
    email: '',
    password: '',
    nom_ecole: '',
    slug: '',
    telephone: '',
    directeur_nom: '',
    sections: ['francophone'] as Section[],
    cle_licence: '',
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
      : { valid: false, message: data.error || 'Clé invalide' })
    setVerifyingLicence(false)
  }

  async function handleContinueStep1() {
    if (!form.cle_licence.trim()) return
    setVerifyingLicence(true)
    const res = await fetch(`/api/auth/verify-licence?cle=${encodeURIComponent(form.cle_licence.trim())}`)
    const data = await res.json()
    setLicenceInfo(data.valid
      ? { valid: true, message: data.message, plan: data.plan }
      : { valid: false, message: data.error || 'Clé invalide' })
    setVerifyingLicence(false)
    if (!data.valid) {
      setError(data.error || 'Clé de licence invalide')
      return
    }
    goToStep(2)
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const slug = form.slug || slugify(form.nom_ecole)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, slug }),
      credentials: 'include',
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Impossible de créer le compte.')
      setLoading(false)
      return
    }

    router.push(`/${data.slug}/dashboard`)
  }

  const step1Valid = form.email && form.password.length >= 8 && form.cle_licence
  const step2Valid = form.nom_ecole && form.directeur_nom && form.slug

  return (
    <AuthSplitLayout
      mode="register"
      title="Créer un compte"
      subtitle="Remplissez le formulaire pour configurer votre établissement."
      footer={
        <>
          Déjà inscrit ?{' '}
          <Link href="/login" className="font-medium text-emerald-400 transition-colors hover:text-emerald-300">
            Se connecter
          </Link>
        </>
      }
    >
      <AuthStepper step={step} />

      <AuthError message={error} />

      {step === 1 && (
        <AuthStepContent stepKey={1}>
          <div className="space-y-5">
            <AuthInput
              id="email"
              label="Adresse email"
              icon={Mail}
              type="email"
              value={form.email}
              onChange={v => updateField('email', v)}
              placeholder="directeur@ecole.cm"
              autoComplete="email"
            />
            <AuthInput
              id="password"
              label="Mot de passe"
              icon={Lock}
              type="password"
              value={form.password}
              onChange={v => updateField('password', v)}
              hint="8 caractères minimum."
              minLength={8}
              autoComplete="new-password"
            />
            <AuthInput
              id="cle"
              label="Clé de licence"
              icon={KeyRound}
              value={form.cle_licence}
              onChange={v => {
                updateField('cle_licence', v.toUpperCase())
                setLicenceInfo(null)
              }}
              onBlur={verifyLicence}
              placeholder="STANDARD-POOL-2026-XXXXXXXX"
              mono
            />
            {verifyingLicence && (
              <p className="text-xs text-zinc-500 -mt-3">Vérification de la clé...</p>
            )}
            {licenceInfo && !verifyingLicence && (
              <p className={`text-xs -mt-3 ${licenceInfo.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                {licenceInfo.message}
              </p>
            )}
            <AuthButton disabled={!step1Valid || verifyingLicence} onClick={handleContinueStep1}>
              Continuer
            </AuthButton>
          </div>
        </AuthStepContent>
      )}

      {step === 2 && (
        <AuthStepContent stepKey={2}>
          <div className="space-y-5">
            <AuthInput
              id="nom_ecole"
              label="Nom de l'établissement"
              icon={Building2}
              value={form.nom_ecole}
              onChange={v =>
                setForm(prev => ({ ...prev, nom_ecole: v, slug: slugify(v) }))
              }
              placeholder="Collège Bilingue de la Réussite"
            />
            <div className="auth-field group">
              <label htmlFor="slug" className="mb-2 flex items-center gap-2 text-[13px] font-medium text-zinc-400">
                <Link2 className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.75} />
                Identifiant URL
              </label>
              <div className="flex overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all duration-200 focus-within:border-emerald-500/50 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.12)]">
                <span className="flex items-center border-r border-white/[0.08] px-3 text-[13px] text-zinc-600">
                  /
                </span>
                <input
                  id="slug"
                  type="text"
                  value={form.slug}
                  onChange={e => updateField('slug', slugify(e.target.value))}
                  className="flex-1 bg-transparent px-3 py-3 font-mono text-sm text-white outline-none"
                />
              </div>
            </div>
            <AuthInput
              id="directeur"
              label="Nom du directeur"
              icon={User}
              value={form.directeur_nom}
              onChange={v => updateField('directeur_nom', v)}
              placeholder="M. Jean-Pierre MBALLA"
            />
            <AuthInput
              id="telephone"
              label="Téléphone (optionnel)"
              icon={Phone}
              type="tel"
              value={form.telephone}
              onChange={v => updateField('telephone', v)}
              placeholder="699 000 000"
            />
            <div className="flex gap-3">
              <AuthButton variant="ghost" className="flex-1" onClick={() => goToStep(1)}>
                Retour
              </AuthButton>
              <AuthButton className="flex-1" disabled={!step2Valid} onClick={() => goToStep(3)}>
                Continuer
              </AuthButton>
            </div>
          </div>
        </AuthStepContent>
      )}

      {step === 3 && (
        <AuthStepContent stepKey={3}>
          <form onSubmit={handleRegister} className="space-y-5">
            <p className="text-[13px] text-zinc-500">Sections gérées par votre établissement :</p>
            <div className="space-y-2.5">
              {SECTIONS.map(opt => {
                const selected = form.sections.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleSection(opt.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 active:scale-[0.99] ${
                      selected
                        ? 'border-emerald-500/40 bg-emerald-500/[0.08] shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                        : 'border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                        selected
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-zinc-600 bg-transparent'
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{opt.label}</p>
                      <p className="text-[12px] text-zinc-500">{opt.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3 pt-1">
              <AuthButton type="button" variant="ghost" className="flex-1" onClick={() => goToStep(2)}>
                Retour
              </AuthButton>
              <AuthButton type="submit" className="flex-1" disabled={form.sections.length === 0} loading={loading}>
                {loading ? 'Création…' : 'Créer mon école'}
              </AuthButton>
            </div>
          </form>
        </AuthStepContent>
      )}
    </AuthSplitLayout>
  )
}
