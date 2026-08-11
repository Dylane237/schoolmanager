import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '../../../../lib/db-server'
import { hashPassword } from '../../../../lib/auth'
import { normalizeRecoveryCode, verifyRecoveryCode } from '../../../../lib/recovery-code'

export async function POST(request: NextRequest) {
  try {
    const { email, recovery_code, new_password } = await request.json()

    if (!email || !recovery_code || !new_password) {
      return NextResponse.json(
        { error: 'Email, code de secours et nouveau mot de passe requis' },
        { status: 400 },
      )
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' },
        { status: 400 },
      )
    }

    const db = getDb()
    const user = db.prepare(`
      SELECT id, recovery_code_hash, role FROM users WHERE email = ?
    `).get(email.trim().toLowerCase()) as {
      id: string
      recovery_code_hash: string | null
      role: string
    } | undefined

    if (!user) {
      return NextResponse.json(
        { error: 'Aucun compte trouvé avec cet email' },
        { status: 404 },
      )
    }

    if (user.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Contactez le support éditeur pour réinitialiser ce compte' },
        { status: 403 },
      )
    }

    if (!user.recovery_code_hash) {
      return NextResponse.json(
        { error: 'Aucun code de secours enregistré. Contactez le support.' },
        { status: 400 },
      )
    }

    const valid = await verifyRecoveryCode(
      normalizeRecoveryCode(recovery_code),
      user.recovery_code_hash,
    )

    if (!valid) {
      return NextResponse.json(
        { error: 'Code de secours incorrect' },
        { status: 401 },
      )
    }

    const passwordHash = await hashPassword(new_password)
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[reset-password]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
