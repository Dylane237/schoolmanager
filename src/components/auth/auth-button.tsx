'use client'

import { Loader2 } from 'lucide-react'

type AuthButtonProps = {
  children: React.ReactNode
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'ghost'
  onClick?: () => void
  className?: string
}

export function AuthButton({
  children,
  type = 'button',
  disabled,
  loading,
  variant = 'primary',
  onClick,
  className = '',
}: AuthButtonProps) {
  const base =
    'relative inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40'

  const variants = {
    primary:
      'bg-emerald-500 text-white shadow-[0_4px_24px_rgba(16,185,129,0.25)] hover:bg-emerald-400 hover:shadow-[0_6px_32px_rgba(16,185,129,0.35)]',
    ghost:
      'border border-white/[0.1] bg-transparent text-zinc-300 hover:border-white/[0.18] hover:bg-white/[0.04] hover:text-white',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
}
