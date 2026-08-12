import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '../../../../lib/auth'
import { requireModule } from '../../../../lib/rbac.server'
import { executeStudentImport } from '../../../../lib/student-import'
import type { StudentSection } from '../../../../lib/csv-students'
import { parseStudentImportFile } from '../../../../lib/file-import'
import { hasSchoolAccess, getSchoolDbContext, jsonPersist } from '../../../../lib/school-api'

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!hasSchoolAccess(user)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'eleves', 'POST')
  if (denied) return denied

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })

  const createMissingClasses = formData.get('createMissingClasses') === 'true'
  const defaultSection = (formData.get('defaultSection') as StudentSection) || 'francophone'

  let csvText: string
  try {
    const buffer = await file.arrayBuffer()
    csvText = parseStudentImportFile(buffer, file.name, file.type).csvText
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Format invalide' }, { status: 400 })
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: 'Fichier vide' }, { status: 400 })
  }

  const { db, ecoleId, ecoleSlug } = getSchoolDbContext(user)
  if (!ecoleId) return NextResponse.json({ error: 'École introuvable' }, { status: 404 })

  const result = executeStudentImport(db, ecoleId, csvText, {
    createMissingClasses,
    defaultSection,
  })

  return jsonPersist(ecoleSlug, {
    success: true,
    ...result,
    total: result.assigned + result.created,
  })
}
