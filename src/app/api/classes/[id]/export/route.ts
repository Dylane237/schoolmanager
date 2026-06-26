import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getUserFromRequest } from '../../../../../lib/auth'
import { getDb } from '../../../../../lib/db-server'
import { getExportsDir } from '../../../../../lib/paths'
import { buildClassListHtml } from '../../../../../lib/class-list-export'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(request)
  if (!user?.ecole_id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const db = getDb()

  const ecole = db.prepare('SELECT nom FROM ecoles WHERE id = ?').get(user.ecole_id) as { nom: string } | undefined
  const classe = db.prepare(`
    SELECT c.*, p.nom as enseignant_nom, p.prenom as enseignant_prenom
    FROM classes c
    LEFT JOIN personnel p ON p.id = c.personnel_id
    WHERE c.id = ? AND c.ecole_id = ?
  `).get(id, user.ecole_id) as Record<string, unknown> | undefined

  if (!classe) return NextResponse.json({ error: 'Classe introuvable' }, { status: 404 })

  const eleves = db.prepare(`
    SELECT e.numero_matricule, e.nom, e.prenom, e.sexe, e.date_naissance,
           p.telephone as parent_telephone
    FROM eleves e
    LEFT JOIN parents p ON p.eleve_id = e.id AND p.est_principal = 1
    WHERE e.classe_id = ? AND e.statut = 'actif'
    ORDER BY e.nom, e.prenom
  `).all(id) as {
    numero_matricule: string; nom: string; prenom: string; sexe: string
    date_naissance: string | null; parent_telephone: string | null
  }[]

  const exportedAt = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const enseignant = classe.enseignant_nom
    ? `${classe.enseignant_nom}${classe.enseignant_prenom ? ` ${classe.enseignant_prenom}` : ''}`
    : null

  const html = buildClassListHtml({
    ecoleNom: ecole?.nom ?? 'École',
    classeNom: classe.nom as string,
    section: classe.section as string,
    anneeScolaire: classe.annee_scolaire as string,
    enseignant,
    eleves,
    exportedAt,
  })

  const safeName = (classe.nom as string).replace(/[^a-zA-Z0-9-_]/g, '_')
  const dateStamp = new Date().toISOString().slice(0, 10)
  const filename = `liste-${safeName}-${dateStamp}.html`
  const exportsDir = getExportsDir()
  const filePath = path.join(exportsDir, filename)
  fs.writeFileSync(filePath, html, 'utf8')

  const { searchParams } = new URL(request.url)
  if (searchParams.get('format') === 'json') {
    return NextResponse.json({
      success: true,
      filename,
      filePath,
      html,
      count: eleves.length,
    })
  }

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  })
}
