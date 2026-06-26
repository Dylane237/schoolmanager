import { NextRequest, NextResponse } from 'next/server'
import { loginUser, setAuthCookie } from '../../../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    const result = await loginUser(email, password)
    if ('error' in result) {
      const status = result.error === 'Licence expirée' || result.error === 'Licence utilisée sur un autre ordinateur' ? 403 : 401
      return NextResponse.json({ error: result.error }, { status })
    }

    const response = NextResponse.json({ user: result.user })
    setAuthCookie(response, result.token)
    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
