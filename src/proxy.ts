import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

async function getSecretKey(): Promise<Uint8Array> {
  if (process.env.SM_JWT_SECRET) {
    return new TextEncoder().encode(process.env.SM_JWT_SECRET)
  }
  const { getJwtSecret, getJwtSecretKey } = await import('./lib/secrets')
  process.env.SM_JWT_SECRET = getJwtSecret()
  return getJwtSecretKey()
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const publicPaths = [
    '/login',
    '/register',
    '/licence-expiree',
    '/api/auth',
    '/api/licences',
  ]

  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('sm_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, await getSecretKey())
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}