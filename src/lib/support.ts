/** Numéro WhatsApp support (sans +), configurable via env. */
export const SUPPORT_WHATSAPP =
  process.env.NEXT_PUBLIC_SM_SUPPORT_WHATSAPP || '237673293424'

export const SUPPORT_PHONE_DISPLAY =
  process.env.NEXT_PUBLIC_SM_SUPPORT_PHONE || '640 23 60 25'

export function getSupportWhatsAppUrl(message?: string): string {
  const text = message
    ? encodeURIComponent(message)
    : encodeURIComponent('Bonjour, j\'ai besoin d\'aide avec SchoolManager.')
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${text}`
}
