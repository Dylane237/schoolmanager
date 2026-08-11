import { cookies } from 'next/headers'

export default async function AdminLicencesLayout({ children }: { children: React.ReactNode }) {
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
