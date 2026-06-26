'use client'

import { Eye, EyeOff, type LucideIcon } from 'lucide-react'
import { useState } from 'react'

type AuthInputProps = {
  id: string
  label: string
  icon: LucideIcon
  type?: 'text' | 'email' | 'password' | 'tel'
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  hint?: string
  mono?: boolean
  minLength?: number
  onBlur?: () => void
}

export function AuthInput({
  id,
  label,
  icon: Icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  hint,
  mono,
  minLength,
  onBlur,
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="auth-field group">
      <label htmlFor={id} className="mb-2 flex items-center gap-2 text-[13px] font-medium text-zinc-400">
        <Icon className="h-3.5 w-3.5 text-zinc-500 transition-colors group-focus-within:text-emerald-400" strokeWidth={1.75} />
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          className={`auth-input w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-all duration-200 focus:border-emerald-500/50 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(16,185,129,0.12)] ${mono ? 'font-mono tracking-wide' : ''} ${isPassword ? 'pr-11' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 transition-colors hover:text-zinc-300"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-[12px] text-zinc-600">{hint}</p>}
    </div>
  )
}
