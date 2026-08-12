'use client'

import { useRouter } from 'next/navigation'
import { setLastLoginEmail } from '@/lib/last-login-email'

interface LogoutButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function LogoutButton({ className, children }: LogoutButtonProps) {
  const router = useRouter()

  async function handleLogout() {
    const res = await fetch('/api/auth/logout', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      if (data.email) setLastLoginEmail(data.email)
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <button type="button" onClick={handleLogout} className={className}>
      {children || 'Déconnexion'}
    </button>
  )
}
