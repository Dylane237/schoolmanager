'use client'

export function AuthError({ message }: { message: string }) {
  if (!message) return null

  return (
    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
      {message}
    </div>
  )
}
