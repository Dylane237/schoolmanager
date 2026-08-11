import { NextRequest, NextResponse } from 'next/server'
import { restoreDatabase } from '@/lib/backup'

// Appelé uniquement en local par le processus principal Electron (127.0.0.1),
// après sélection d'un fichier .db via la boîte de dialogue native.
export async function POST(req: NextRequest) {
  // Le serveur écoute déjà sur 127.0.0.1 (HOSTNAME dans main.js), donc rien
  // d'externe ne peut normalement atteindre cette route. Ce check est un
  // filet de sécurité supplémentaire, pas la protection principale.
  const host = req.headers.get('host') || ''
  if (!host.startsWith('127.0.0.1') && !host.startsWith('localhost')) {
    return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 })
  }

  try {
    const { sourcePath } = await req.json()

    if (!sourcePath || typeof sourcePath !== 'string') {
      return NextResponse.json({ success: false, error: 'Chemin de fichier manquant.' }, { status: 400 })
    }

    // Le sélecteur natif filtre déjà sur .db, et restoreDatabase() vérifie
    // la signature SQLite réelle du fichier — cette vérification d'extension
    // n'est qu'un rejet rapide avant même de toucher au disque.
    if (!sourcePath.toLowerCase().endsWith('.db')) {
      return NextResponse.json({ success: false, error: 'Le fichier doit être une base .db.' }, { status: 400 })
    }

    const result = restoreDatabase(sourcePath)

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    )
  }
}