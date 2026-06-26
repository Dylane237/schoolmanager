'use client'

import { useRouter } from 'next/navigation'

interface LogoutButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function LogoutButton({ className, children }: LogoutButtonProps) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <button type="button" onClick={handleLogout} className={className}>
      {children || 'Déconnexion'}
    </button>
  )
}
