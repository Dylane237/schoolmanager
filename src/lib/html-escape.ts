/** Échappe les caractères HTML pour éviter les injections XSS. */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** N'autorise que les URLs relatives vers nos uploads élèves. */
export function safeUploadUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (/^\/api\/uploads\/eleves\/[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return trimmed
  }
  return null
}
