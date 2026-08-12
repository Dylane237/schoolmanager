'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import type { Locale } from '@/i18n/config'
import { localeLabels, locales } from '@/i18n/config'

type LanguageSwitcherProps = {
  variant?: 'sidebar' | 'auth'
}

export default function LanguageSwitcher({ variant = 'sidebar' }: LanguageSwitcherProps) {
  const t = useTranslations('language')
  const locale = useLocale() as Locale
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const setLocale = (next: Locale) => {
    if (next === locale || pending) return
    startTransition(async () => {
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      })
      router.refresh()
    })
  }

  if (variant === 'auth') {
    return (
      <div
        className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 text-[12px] font-medium shadow-sm"
        role="group"
        aria-label={t('label')}
      >
        {locales.map(code => (
          <button
            key={code}
            type="button"
            disabled={pending}
            onClick={() => setLocale(code)}
            className={`rounded-md px-2.5 py-1 transition-colors ${
              locale === code
                ? 'bg-emerald-600 text-white'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="px-3 py-2" role="group" aria-label={t('label')}>
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {t('label')}
      </p>
      <div className="flex gap-1">
        {locales.map(code => (
          <button
            key={code}
            type="button"
            disabled={pending}
            onClick={() => setLocale(code)}
            title={localeLabels[code]}
            className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
              locale === code
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {code.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
