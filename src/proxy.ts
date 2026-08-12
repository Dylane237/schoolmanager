import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

async function getSecretKey(): Promise<Uint8Array> {
  const { runtimeEnv } = await import('./lib/runtime-env')
  const envSecret = runtimeEnv('SM_JWT_SECRET')
  if (envSecret) {
    return new TextEncoder().encode(envSecret)
  }
  const { getJwtSecret, getJwtSecretKey } = await import('./lib/secrets')
  process.env.SM_JWT_SECRET = getJwtSecret()
  return getJwtSecretKey()
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const publicPaths = [
    '/',
    '/telecharger',
    '/tarifs',
    '/contact',
    '/login',
    '/register',
    '/mot-de-passe-oublie',
    '/licence-expiree',
    '/api/auth',
    '/api/locale',
    '/api/licences',
    '/admin-licences',
    '/api/admin-licences',
  ]

  if (publicPaths.some(p => pathname === p || (p !== '/' && pathname.startsWith(p)))) {
    return NextResponse.next()
  }

  const isApi = pathname.startsWith('/api/')

  const token = request.cookies.get('sm_token')?.value
  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, await getSecretKey())
    return NextResponse.next()
  } catch {
    if (isApi) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}