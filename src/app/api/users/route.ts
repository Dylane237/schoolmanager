import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, hashPassword } from '../../../lib/auth'
import { getDb } from '../../../lib/db-server'
import { requireModule } from '../../../lib/rbac.server'
import { logAudit } from '../../../lib/audit-log'
import type { Role } from '@/types'

const CREATION_ROLES: Role[] = ['secretaire', 'comptable', 'enseignant']

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Réservé à l\'administrateur' }, { status: 403 })
  }

  const db = getDb()
  const users = db.prepare(`
    SELECT id, email, nom, prenom, role, telephone, created_at
    FROM users
    WHERE ecole_id = ?
    ORDER BY role, nom
  `).all(user.ecole_id)

  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Réservé à l\'administrateur' }, { status: 403 })
  }

  const body = await request.json()
  const { email, password, nom, prenom, role, telephone } = body

  if (!email || !password || !nom || !role) {
    return NextResponse.json({ error: 'Email, mot de passe, nom et rôle requis' }, { status: 400 })
  }

  if (!CREATION_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Rôle non autorisé' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Mot de passe : 8 caractères minimum' }, { status: 400 })
  }

  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 })
  }

  const password_hash = await hashPassword(password)
  db.prepare(`
    INSERT INTO users (email, password_hash, nom, prenom, role, telephone, ecole_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(email, password_hash, nom, prenom || null, role, telephone || null, user.ecole_id)

  const created = db.prepare(`
    SELECT id, email, nom, prenom, role, telephone, created_at FROM users WHERE email = ?
  `).get(email) as { id: string; email: string; role: string }

  logAudit(db, {
    ecoleId: user.ecole_id,
    userId: user.id,
    action: 'create',
    module: 'users',
    entityId: created.id,
    details: { email: created.email, role: created.role },
  })

  return NextResponse.json({ success: true, user: created })
}

export async function DELETE(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  if (user.role !== 'admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Réservé à l\'administrateur' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  if (id === user.id) {
    return NextResponse.json({ error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 })
  }

  const db = getDb()
  const target = db.prepare('SELECT id, role FROM users WHERE id = ? AND ecole_id = ?').get(id, user.ecole_id) as {
    id: string; role: string
  } | undefined

  if (!target) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  if (target.role === 'admin') {
    return NextResponse.json({ error: 'Impossible de supprimer un administrateur' }, { status: 400 })
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id)

  logAudit(db, {
    ecoleId: user.ecole_id,
    userId: user.id,
    action: 'delete',
    module: 'users',
    entityId: id,
    details: { role: target.role },
  })

  return NextResponse.json({ success: true })
}
