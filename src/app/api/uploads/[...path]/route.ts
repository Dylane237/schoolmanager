import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getUserFromRequest } from '@/lib/auth'
import { resolveUploadPath } from '@/lib/upload'

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { path: segments } = await params
  if (!segments?.length || segments[0] !== 'eleves') {
    return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 })
  }

  const relativePath = segments.slice(1).join('/')
  if (segments[1] !== user.ecole_id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const filePath = resolveUploadPath(relativePath)
  if (!filePath) {
    return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
  }

  const ext = path.extname(filePath).slice(1).toLowerCase()
  const buffer = fs.readFileSync(filePath)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': MIME[ext] ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
