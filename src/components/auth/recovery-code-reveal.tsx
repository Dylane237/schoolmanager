'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Copy, Check, AlertTriangle } from 'lucide-react'
import { AuthButton } from './auth-button'

type RecoveryCodeRevealProps = {
  code: string
  onContinue: () => void
}

export function RecoveryCodeReveal({ code, onContinue }: RecoveryCodeRevealProps) {
  const t = useTranslations('auth.recovery')
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-900">{t('warningTitle')}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-amber-800/90">
            {t('warningBody')}
          </p>
        </div>
      </div>

      <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-5 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
          {t('codeLabel')}
        </p>
        <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-gray-900">{code}</p>
        <button
          type="button"
          onClick={handleCopy}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-[13px] font-medium text-emerald-700 transition-colors hover:bg-emerald-50"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t('copied') : t('copy')}
        </button>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={e => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        <span className="text-[13px] text-gray-600">
          {t('confirmCheckbox')}
        </span>
      </label>

      <AuthButton disabled={!confirmed} onClick={onContinue}>
        {t('continue')}
      </AuthButton>
    </div>
  )
}
