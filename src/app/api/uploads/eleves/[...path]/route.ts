import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getUserFromRequest } from '../../../../../lib/auth'
import { resolveUploadPath } from '../../../../../lib/upload'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { path: segments } = await params
  const ecoleId = segments[0]
  if (user.role !== 'super_admin' && user.ecole_id !== ecoleId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const relativePath = segments.join('/')
  const filePath = resolveUploadPath(relativePath)

  if (!filePath) {
    return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
  }

  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  }

  const buffer = fs.readFileSync(filePath)
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
