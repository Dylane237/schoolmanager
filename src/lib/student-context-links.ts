/** Données minimales pour construire des liens contextuels vers un élève. */
export interface StudentContext {
  id: string
  nom: string
  prenom: string
  numero_matricule: string
  classe_id?: string | null
  section?: string | null
}

function enc(v: string) {
  return encodeURIComponent(v)
}

/** Liens pré-remplis depuis la fiche élève ou tout autre écran. */
export function studentLinks(slug: string, s: StudentContext) {
  const q = s.numero_matricule || `${s.nom} ${s.prenom}`.trim()
  const classe = s.classe_id || ''
  const base = `/${slug}`

  return {
    fiche: `${base}/eleves/${s.id}`,
    encaisser: `${base}/paiements/nouveau?eleve_id=${s.id}`,
    encaisserExamen: `${base}/paiements/nouveau?eleve_id=${s.id}&type=frais_examen`,
    paiements: `${base}/paiements?tab=situation&q=${enc(q)}${classe ? `&classe=${classe}` : ''}`,
    bulletin: `${base}/notes/bulletins?eleve_id=${s.id}${classe ? `&classe=${classe}` : ''}`,
    notes: `${base}/notes/saisie?eleve_id=${s.id}${classe ? `&classe=${classe}` : ''}&q=${enc(q)}`,
    presences: `${base}/presences?eleve_id=${s.id}${classe ? `&classe=${classe}` : ''}&q=${enc(q)}`,
    transfert: `${base}/classes/transferts?q=${enc(`${s.nom} ${s.prenom}`.trim())}`,
    classe: classe ? `${base}/classes/${classe}` : `${base}/classes`,
    maternelle: `${base}/maternelle?eleve_id=${s.id}${classe ? `&classe=${classe}` : ''}`,
  }
}

/** Patch de filtres standard à appliquer quand on arrive avec ?eleve_id= */
export function studentFilterPatch(s: StudentContext): Record<string, string> {
  const patch: Record<string, string> = {
    q: s.numero_matricule || `${s.nom} ${s.prenom}`.trim(),
  }
  if (s.classe_id) patch.classe = s.classe_id
  return patch
}
