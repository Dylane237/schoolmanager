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
    'relative inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none'

  const variants = {
    primary:
      'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-600/25 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none',
    ghost:
      'border border-gray-200 bg-white text-gray-700 shadow-sm hover:border-gray-300 hover:bg-gray-50',
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
