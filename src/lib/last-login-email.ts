const STORAGE_KEY = 'sm_last_login_email'

export function getLastLoginEmail(): string {
  if (typeof window === 'undefined') return ''
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

export function setLastLoginEmail(email: string): void {
  if (typeof window === 'undefined') return
  const trimmed = email.trim()
  if (!trimmed) return
  try {
    localStorage.setItem(STORAGE_KEY, trimmed)
  } catch {
    // localStorage indisponible (mode privé, quota…)
  }
}
