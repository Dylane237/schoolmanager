import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function AdminLicencesLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_licences_token')?.value
  const expected = process.env.SUPER_ADMIN_PASSWORD

  // Si pas de token ou mauvais token, laisser passer (la page gère le login)
  const authed = token && expected && token === expected

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>SchoolManager — Administration</title>
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
