'use client'

export function AuthError({ message }: { message: string }) {
  if (!message) return null

  return (
    <div className="auth-error mb-5 rounded-xl border border-red-500/20 bg-red-500/[0.08] px-4 py-3 text-[13px] text-red-300">
      {message}
    </div>
  )
}
