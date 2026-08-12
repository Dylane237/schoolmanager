import { NextRequest, NextResponse } from 'next/server'
import { defaultLocale, isLocale, LOCALE_COOKIE } from '@/i18n/config'

export async function POST(request: NextRequest) {
  let locale = defaultLocale
  try {
    const body = await request.json()
    if (isLocale(body?.locale)) locale = body.locale
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const response = NextResponse.json({ success: true, locale })
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false,
  })
  return response
}
