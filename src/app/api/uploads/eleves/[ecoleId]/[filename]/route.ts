import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getUserFromRequest } from '@/lib/auth'
import { resolveUploadPath } from '@/lib/upload'
import { requireModule } from '@/lib/rbac.server'

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ecoleId: string; filename: string }> },
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const denied = requireModule(user, 'eleves', 'GET')
  if (denied) return denied

  const { ecoleId, filename } = await params

  if (user.role !== 'super_admin' && user.ecole_id !== ecoleId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
    return NextResponse.json({ error: 'Nom de fichier invalide' }, { status: 400 })
  }

  const relativePath = path.join(ecoleId, filename)
  const filePath = resolveUploadPath(relativePath)
  if (!filePath) {
    return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const contentType = MIME[ext]
  if (!contentType) {
    return NextResponse.json({ error: 'Type de fichier non autorisé' }, { status: 400 })
  }

  const buffer = fs.readFileSync(filePath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
