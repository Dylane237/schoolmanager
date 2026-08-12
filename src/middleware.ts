import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

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
  '/api/health',
  '/api/locale',
  '/api/licences',
  '/admin-licences',
  '/api/admin-licences',
]

function getSecretKey(): Uint8Array | null {
  const secret = process.env.SM_JWT_SECRET
  if (!secret) return null
  return new TextEncoder().encode(secret)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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

  const secretKey = getSecretKey()
  if (!secretKey) {
    if (isApi) {
      return NextResponse.json({ error: 'Configuration serveur invalide' }, { status: 503 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, secretKey)
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
