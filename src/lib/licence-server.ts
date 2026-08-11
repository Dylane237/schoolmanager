/** URL du serveur de licences (Vercel) — utilisé par renew/register, pas par verify-licence. */
export const LICENCE_SERVER_URL =
  process.env.NEXT_PUBLIC_LICENCE_SERVER_URL || 'https://schoolmanager-eosin.vercel.app'

export function maskLicenceKey(cle: string): string {
  const k = cle.trim().toUpperCase()
  if (k.length <= 8) return '••••••••'
  return `${k.slice(0, 4)}••••${k.slice(-4)}`
}
