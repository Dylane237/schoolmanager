
import { NextRequest, NextResponse } from 'next/server'
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
} from '@/lib/supabase-admin'
import { isAdminLicencesAuthed } from '@/lib/admin-licences-auth'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function GET(request: NextRequest) {
  // 1. Vérifier l'authentification
  try {
    const isAuthed = await isAdminLicencesAuthed(request)

    if (!isAuthed) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('[admin-licences/list] Authentification:', error)

    return NextResponse.json(
      { error: 'Erreur lors de la vérification de l’authentification' },
      { status: 500 }
    )
  }

  let stage = 'initialisation'

  try {
    // 2. Vérifier la configuration Supabase
    stage = 'vérification de la configuration Supabase'

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Configuration Supabase manquante', stage },
        { status: 503 }
      )
    }

    const supabase = getSupabaseAdmin()

    if (!supabase) {
      throw new Error('Client Supabase indisponible')
    }

    // 3. Charger les licences
    stage = 'lecture de la table licences'

    const { data: licences, error: licencesError } = await supabase
      .from('licences')
      .select('*')
      .order('created_at', { ascending: false })

    if (licencesError) {
      console.error('[admin-licences/list] Licences:', licencesError)

      return NextResponse.json(
        {
          error: 'Erreur de lecture des licences',
          stage,
          details: licencesError.message,
          code: licencesError.code,
        },
        { status: 500 }
      )
    }

    const rows = licences || []

    // 4. Préparer les identifiants des écoles
    stage = 'préparation des identifiants des écoles'

    const slugCandidates = new Set<string>()

    for (const licence of rows) {
      if (licence.ecole_slug) {
        slugCandidates.add(licence.ecole_slug)
      }

      if (licence.ecole_id && !isUuid(licence.ecole_id)) {
        slugCandidates.add(licence.ecole_id)
      }
    }

    const ecolesBySlug: Record<
      string,
      {
        nom: string
        slug: string
        directeur_nom?: string
        telephone?: string
      }
    > = {}

    // 5. Charger les écoles correspondantes
    if (slugCandidates.size > 0) {
      stage = 'lecture de la table ecoles'

      const { data: ecoles, error: ecolesError } = await supabase
        .from('ecoles')
        .select('nom, slug, directeur_nom, telephone')
        .in('slug', [...slugCandidates])

      if (ecolesError) {
        console.error('[admin-licences/list] Ecoles:', ecolesError)

        return NextResponse.json(
          {
            error: 'Erreur de lecture des écoles',
            stage,
            details: ecolesError.message,
            code: ecolesError.code,
          },
          { status: 500 }
        )
      }

      for (const ecole of ecoles || []) {
        if (ecole.slug) {
          ecolesBySlug[ecole.slug] = ecole
        }
      }
    }

    // 6. Associer les licences aux écoles
    stage = 'assemblage des résultats'

    const licencesWithEcoles = rows.map((licence) => {
      const slugKey =
        licence.ecole_slug ||
        (licence.ecole_id && !isUuid(licence.ecole_id)
          ? licence.ecole_id
          : null)

      const ecole = slugKey ? ecolesBySlug[slugKey] : null

      return {
        ...licence,
        ecoles: ecole
          ? { nom: ecole.nom, slug: ecole.slug }
          : null,
        ecole_nom: licence.ecole_nom || ecole?.nom || null,
        ecole_slug: slugKey || ecole?.slug || null,
        directeur_nom: ecole?.directeur_nom ?? null,
        telephone: ecole?.telephone ?? null,
      }
    })

    // 7. Retourner les données
    return NextResponse.json({
      licences: licencesWithEcoles,
    })
  } catch (error) {
    console.error(
      `[admin-licences/list] Étape : ${stage}`,
      error
    )

    return NextResponse.json(
      {
        error: 'Erreur interne lors du chargement des licences',
        stage,
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}
