import { escapeHtml } from './html-escape'

export type DocumentSection = 'francophone' | 'anglophone' | 'maternelle'

export interface EcoleDocumentInfo {
  nom: string
  adresse?: string | null
  telephone?: string | null
  email?: string | null
  directeur_nom?: string | null
  entete_url?: string | null
}

/** Autorise les URLs d'en-tête : uploads API ou data-URL image (base64). */
export function safeEnteteUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (/^\/api\/uploads\/(eleves|ecole)\/[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+$/.test(trimmed)) {
    return trimmed
  }
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) {
    if (trimmed.length > 3_000_000) return null
    return trimmed
  }
  return null
}

export function getMinistryHeader(section: DocumentSection) {
  if (section === 'anglophone') {
    return {
      republique: 'REPUBLIC OF CAMEROON',
      devise: 'Peace — Work — Fatherland',
      ministere: 'MINISTRY OF BASIC EDUCATION',
    }
  }
  return {
    republique: 'RÉPUBLIQUE DU CAMEROUN',
    devise: 'Paix — Travail — Patrie',
    ministere: section === 'maternelle'
      ? "MINISTÈRE DE L'ÉDUCATION DE BASE"
      : "MINISTÈRE DE L'ÉDUCATION DE BASE",
  }
}

export function formatPeriodeLabel(periode: string, section: DocumentSection): string {
  if (section === 'anglophone') {
    const n = periode.replace(/^S/i, '')
    return `Term ${n}`
  }
  const n = parseInt(periode.replace(/^T/i, ''), 10)
  const ordinals = ['', '1er', '2ème', '3ème']
  const ord = ordinals[n] || `${n}ème`
  return `${ord} trimestre`
}

export function getDocumentTitle(section: DocumentSection, kind: 'bulletin' | 'fiche' | 'liste'): string {
  if (section === 'anglophone') {
    if (kind === 'bulletin') return 'REPORT CARD'
    if (kind === 'fiche') return 'STUDENT RECORD'
    return 'CLASS LIST'
  }
  if (kind === 'bulletin') {
    return section === 'maternelle' ? "BULLETIN D'ÉVALUATION" : 'BULLETIN DE NOTES'
  }
  if (kind === 'fiche') return "FICHE INDIVIDUELLE DE L'ÉLÈVE"
  return 'LISTE DES ÉLÈVES'
}

/** Bloc en-tête HTML (image personnalisée ou en-tête officielle MINEDUB). */
export function buildDocumentHeaderHtml(
  ecole: EcoleDocumentInfo,
  section: DocumentSection,
  options?: {
    subtitle?: string
    anneeScolaire?: string | null
    documentTitle?: string
  }
): string {
  const enteteUrl = safeEnteteUrl(ecole.entete_url)

  if (enteteUrl) {
    return `
      <div class="doc-entete doc-entete-image">
        <img src="${enteteUrl}" alt="En-tête officielle" />
      </div>
      ${options?.subtitle || options?.anneeScolaire ? `
        <div class="doc-entete-sub">
          ${options.documentTitle ? `<div class="doc-title">${escapeHtml(options.documentTitle)}</div>` : ''}
          ${options.subtitle ? `<div class="doc-subtitle">${escapeHtml(options.subtitle)}</div>` : ''}
          ${options.anneeScolaire ? `<div class="doc-annee">Année scolaire ${escapeHtml(options.anneeScolaire)}</div>` : ''}
        </div>
      ` : ''}
    `
  }

  const m = getMinistryHeader(section)
  const contacts = [
    ecole.adresse,
    ecole.telephone ? `Tél : ${ecole.telephone}` : null,
    ecole.email ? `E-mail : ${ecole.email}` : null,
  ].filter(Boolean).join(' · ')

  return `
    <div class="doc-entete doc-entete-officiel">
      <div class="doc-republique">${escapeHtml(m.republique)}</div>
      <div class="doc-devise">${escapeHtml(m.devise)}</div>
      <div class="doc-ministere">${escapeHtml(m.ministere)}</div>
      <div class="doc-ecole-nom">${escapeHtml(ecole.nom)}</div>
      ${contacts ? `<div class="doc-contacts">${escapeHtml(contacts)}</div>` : ''}
      ${options?.documentTitle ? `<div class="doc-title">${escapeHtml(options.documentTitle)}</div>` : ''}
      ${options?.subtitle ? `<div class="doc-subtitle">${escapeHtml(options.subtitle)}</div>` : ''}
      ${options?.anneeScolaire ? `<div class="doc-annee">Année scolaire ${escapeHtml(options.anneeScolaire)}</div>` : ''}
    </div>
  `
}

/** En-tête simplifiée pour les reçus (image ou bloc école). */
export function buildRecuHeaderHtml(ecole: EcoleDocumentInfo): string {
  const enteteUrl = safeEnteteUrl(ecole.entete_url)
  if (enteteUrl) {
    return `<div class="entete"><img src="${enteteUrl}" alt="En-tête" /></div>`
  }
  return `
    <div class="entete">
      <div style="text-align:center;padding:8px 0;">
        <div style="font-size:13px;font-weight:bold;text-transform:uppercase;">${escapeHtml(ecole.nom)}</div>
        <div style="font-size:11px;margin-top:2px;">${escapeHtml(ecole.adresse)}</div>
        <div style="font-size:11px;margin-top:2px;">
          Tél : ${escapeHtml(ecole.telephone)} &nbsp;|&nbsp; E-mail : ${escapeHtml(ecole.email)}
        </div>
      </div>
    </div>
  `
}

export const DOCUMENT_BASE_STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Georgia, serif; color: #1e293b; font-size: 12px; line-height: 1.4; }
  .doc-entete { text-align: center; margin-bottom: 12px; }
  .doc-entete-image img { max-width: 100%; max-height: 120px; object-fit: contain; display: block; margin: 0 auto; }
  .doc-entete-officiel { border-bottom: 2px double #334155; padding-bottom: 10px; }
  .doc-republique { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
  .doc-devise { font-size: 10px; font-style: italic; color: #475569; margin: 2px 0 6px; }
  .doc-ministere { font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; }
  .doc-ecole-nom { font-size: 15px; font-weight: bold; text-transform: uppercase; margin: 4px 0; }
  .doc-contacts { font-size: 10px; color: #64748b; margin-bottom: 4px; }
  .doc-title { font-size: 13px; font-weight: bold; text-transform: uppercase; margin-top: 8px; letter-spacing: 0.5px; }
  .doc-subtitle { font-size: 12px; color: #475569; margin-top: 2px; }
  .doc-annee { font-size: 11px; font-weight: 600; margin-top: 4px; }
  .doc-entete-sub { text-align: center; margin-bottom: 12px; border-bottom: 2px double #334155; padding-bottom: 8px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin: 14px 0; font-size: 11px; }
  .info-grid .lbl { color: #64748b; }
  table.notes { width: 100%; border-collapse: collapse; margin: 12px 0; }
  table.notes th { background: #f1f5f9; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; border: 1px solid #cbd5e1; }
  table.notes td { padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 11px; }
  table.notes .center { text-align: center; }
  .result-box { display: flex; justify-content: space-around; margin: 16px 0; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; }
  .result-item { text-align: center; }
  .result-item .val { font-size: 18px; font-weight: bold; color: #059669; }
  .result-item .lbl { font-size: 10px; color: #64748b; margin-top: 2px; }
  .observations { margin: 14px 0; font-size: 11px; }
  .observations .line { border-bottom: 1px dotted #94a3b8; min-height: 20px; margin-top: 4px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 32px; gap: 12px; }
  .sig-block { flex: 1; text-align: center; font-size: 10px; color: #64748b; }
  .sig-block .sig-line { border-top: 1px solid #94a3b8; margin-top: 40px; padding-top: 6px; }
  @media print {
    body { padding: 12mm 15mm; }
    @page { size: A4 portrait; margin: 10mm; }
    .no-print { display: none !important; }
  }
`

export interface BulletinPrintData {
  ecole: EcoleDocumentInfo
  classe: { nom: string; section: DocumentSection }
  periode: string
  anneeScolaire: string | null
  noteMax: number
  effectif: number
  bulletin: {
    eleve: {
      nom: string
      prenom: string
      numero_matricule: string
      sexe: string
      date_naissance?: string | null
      lieu_naissance?: string | null
    }
    notes: { matiere: string; coefficient: number; note: number | null; appreciation: string | null }[]
    moyenne: number | null
    mention: string | null
    rang: number | null
  }
}

function formatDateFr(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function buildBulletinHtml(data: BulletinPrintData): string {
  const { ecole, classe, periode, bulletin, noteMax, effectif, anneeScolaire } = data
  const section = classe.section
  const isAng = section === 'anglophone'
  const docTitle = getDocumentTitle(section, 'bulletin')
  const periodeLabel = formatPeriodeLabel(periode, section)
  const subtitle = isAng
    ? `${docTitle} — ${periodeLabel}`
    : `${docTitle} DU ${periodeLabel.toUpperCase()}`

  const header = buildDocumentHeaderHtml(ecole, section, {
    documentTitle: docTitle,
    subtitle: isAng ? periodeLabel : `Du ${periodeLabel}`,
    anneeScolaire,
  })

  const sexeLabel = bulletin.eleve.sexe === 'M'
    ? (isAng ? 'Male' : 'Masculin')
    : bulletin.eleve.sexe === 'F'
      ? (isAng ? 'Female' : 'Féminin')
      : '—'

  const notesRows = bulletin.notes.map(n => `
    <tr>
      <td>${escapeHtml(n.matiere)}</td>
      <td class="center">${n.coefficient}</td>
      <td class="center"><strong>${n.note !== null ? n.note.toFixed(2) : '—'}</strong></td>
      <td class="italic">${escapeHtml(n.appreciation) || '—'}</td>
      <td class="center" style="width:60px"></td>
    </tr>
  `).join('')

  const rangDisplay = bulletin.rang
    ? `${bulletin.rang}${isAng ? '' : 'e'} / ${effectif}`
    : '—'

  return `<!DOCTYPE html>
<html lang="${isAng ? 'en' : 'fr'}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(docTitle)} — ${escapeHtml(bulletin.eleve.nom)}</title>
  <style>${DOCUMENT_BASE_STYLES}</style>
</head>
<body>
  ${header}

  <div class="info-grid">
    <div><span class="lbl">${isAng ? 'Name' : 'Nom et prénom(s)'} : </span><strong>${escapeHtml(bulletin.eleve.nom)} ${escapeHtml(bulletin.eleve.prenom)}</strong></div>
    <div><span class="lbl">${isAng ? 'ID No.' : 'Matricule'} : </span>${escapeHtml(bulletin.eleve.numero_matricule)}</div>
    <div><span class="lbl">${isAng ? 'Date & place of birth' : 'Date et lieu de naissance'} : </span>${formatDateFr(bulletin.eleve.date_naissance)} ${isAng ? 'at' : 'à'} ${escapeHtml(bulletin.eleve.lieu_naissance) || '—'}</div>
    <div><span class="lbl">${isAng ? 'Gender' : 'Sexe'} : </span>${sexeLabel}</div>
    <div><span class="lbl">${isAng ? 'Class' : 'Classe'} : </span><strong>${escapeHtml(classe.nom)}</strong></div>
    <div><span class="lbl">${isAng ? 'Class size' : 'Effectif'} : </span>${effectif} ${isAng ? 'students' : 'élèves'}</div>
  </div>

  <table class="notes">
    <thead>
      <tr>
        <th>${isAng ? 'Subject' : 'Discipline / Matière'}</th>
        <th class="center" style="width:50px">${isAng ? 'Coef.' : 'Coef.'}</th>
        <th class="center" style="width:70px">${isAng ? `Score/${noteMax}` : `Note/${noteMax}`}</th>
        <th>${isAng ? "Teacher's remark" : 'Appréciation du professeur'}</th>
        <th class="center" style="width:60px">${isAng ? 'Sign.' : 'Sign.'}</th>
      </tr>
    </thead>
    <tbody>${notesRows || `<tr><td colspan="5" style="text-align:center;padding:16px;color:#94a3b8">${isAng ? 'No grades' : 'Aucune note saisie'}</td></tr>`}</tbody>
  </table>

  <div class="result-box">
    <div class="result-item">
      <div class="val">${bulletin.moyenne !== null ? bulletin.moyenne.toFixed(2) : '—'}</div>
      <div class="lbl">${isAng ? `Average/${noteMax}` : `Moyenne générale/${noteMax}`}</div>
    </div>
    <div class="result-item">
      <div class="val" style="color:#334155">${rangDisplay}</div>
      <div class="lbl">${isAng ? 'Rank / Size' : 'Rang / Effectif'}</div>
    </div>
    <div class="result-item">
      <div class="val" style="color:#2563eb;font-size:16px">${escapeHtml(bulletin.mention) || '—'}</div>
      <div class="lbl">${isAng ? 'Grade' : 'Mention'}</div>
    </div>
  </div>

  <div class="observations">
    <strong>${isAng ? 'Conduct' : 'Conduite'} :</strong>
    <div class="line"></div>
    <strong style="display:block;margin-top:10px">${isAng ? 'Class council observations' : 'Observations du conseil de classe'} :</strong>
    <div class="line"></div>
  </div>

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">${isAng ? 'Parent / Guardian' : 'Le parent / tuteur'}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${isAng ? 'Class teacher' : "L'enseignant titulaire"}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${escapeHtml(ecole.directeur_nom) || (isAng ? 'The Principal' : 'Le Directeur')}</div>
    </div>
  </div>
</body>
</html>`
}

export interface FicheElevePrintData {
  ecole: EcoleDocumentInfo
  anneeScolaire: string | null
  eleve: {
    nom: string
    prenom: string
    numero_matricule: string
    sexe: string
    date_naissance: string | null
    lieu_naissance: string | null
    classe_nom: string | null
    section: string
    statut_annuel: string | null
    annee_entree: string | null
  }
  parents: { nom: string; prenom: string | null; telephone: string; lien: string }[]
  situation: { total_paye: number; total_attendu: number; total_reste: number; statut: string }
  moyenne: string | null
  tauxPresence: number | null
}

export function buildFicheEleveHtml(data: FicheElevePrintData): string {
  const section = (data.eleve.section || 'francophone') as DocumentSection
  const isAng = section === 'anglophone'
  const docTitle = getDocumentTitle(section, 'fiche')

  const header = buildDocumentHeaderHtml(data.ecole, section, {
    documentTitle: docTitle,
    anneeScolaire: data.anneeScolaire,
  })

  const parentsRows = data.parents.map(p => `
    <tr>
      <td>${escapeHtml(p.nom)} ${escapeHtml(p.prenom ?? '')}</td>
      <td>${escapeHtml(p.lien)}</td>
      <td>${escapeHtml(p.telephone)}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="${isAng ? 'en' : 'fr'}">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(docTitle)} — ${escapeHtml(data.eleve.nom)}</title>
  <style>
    ${DOCUMENT_BASE_STYLES}
    body { padding: 24px 32px; max-width: 800px; margin: 0 auto; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px; }
    .eleve-nom { font-size: 18px; font-weight: bold; margin: 12px 0 4px; text-align: center; }
    .eleve-mat { text-align: center; color: #64748b; font-family: monospace; margin-bottom: 16px; }
    .stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 16px; }
    .stat { text-align: center; padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
    .stat .val { font-size: 18px; font-weight: bold; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
    .box h3 { font-size: 10px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; letter-spacing: 0.05em; }
    .row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    td, th { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    .footer-note { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  ${header}
  <div class="eleve-nom">${escapeHtml(data.eleve.nom)} ${escapeHtml(data.eleve.prenom)}</div>
  <div class="eleve-mat">${escapeHtml(data.eleve.numero_matricule)}</div>

  <div class="stats">
    <div class="stat"><div class="val">${data.situation.total_paye.toLocaleString('fr-FR')} F</div><div>${isAng ? 'Paid' : 'Payé'}</div></div>
    <div class="stat"><div class="val">${data.moyenne ?? '—'}</div><div>${isAng ? 'Average' : 'Moyenne'}</div></div>
    <div class="stat"><div class="val">${data.tauxPresence !== null ? data.tauxPresence + '%' : '—'}</div><div>${isAng ? 'Attendance' : 'Présence'}</div></div>
  </div>

  <div class="grid">
    <div class="box">
      <h3>${isAng ? 'Identity' : 'Identité'}</h3>
      <div class="row"><span>${isAng ? 'Gender' : 'Sexe'}</span><strong>${data.eleve.sexe === 'M' ? (isAng ? 'Male' : 'Masculin') : (isAng ? 'Female' : 'Féminin')}</strong></div>
      <div class="row"><span>${isAng ? 'Birth date' : 'Naissance'}</span><strong>${formatDateFr(data.eleve.date_naissance)}</strong></div>
      <div class="row"><span>${isAng ? 'Birth place' : 'Lieu'}</span><strong>${escapeHtml(data.eleve.lieu_naissance) || '—'}</strong></div>
      <div class="row"><span>${isAng ? 'Class' : 'Classe'}</span><strong>${escapeHtml(data.eleve.classe_nom) || '—'}</strong></div>
      <div class="row"><span>${isAng ? 'Section' : 'Section'}</span><strong>${escapeHtml(data.eleve.section)}</strong></div>
      <div class="row"><span>${isAng ? 'Annual status' : 'Statut annuel'}</span><strong>${escapeHtml(data.eleve.statut_annuel) || '—'}</strong></div>
    </div>
    <div class="box">
      <h3>${isAng ? 'Fees & enrollment' : 'Scolarité & paiements'}</h3>
      <div class="row"><span>${isAng ? 'Entry year' : 'Année entrée'}</span><strong>${escapeHtml(data.eleve.annee_entree) || '—'}</strong></div>
      <div class="row"><span>${isAng ? 'Total due' : 'Total attendu'}</span><strong>${data.situation.total_attendu.toLocaleString('fr-FR')} F</strong></div>
      <div class="row"><span>${isAng ? 'Balance' : 'Reste dû'}</span><strong style="color:${data.situation.total_reste > 0 ? '#dc2626' : '#059669'}">${data.situation.total_reste.toLocaleString('fr-FR')} F</strong></div>
      <div class="row"><span>${isAng ? 'Payment status' : 'Statut paiement'}</span><strong>${escapeHtml(data.situation.statut)}</strong></div>
    </div>
  </div>

  ${data.parents.length ? `
  <div class="box">
    <h3>${isAng ? 'Parents / Guardians' : 'Parents / Tuteurs'}</h3>
    <table><thead><tr><th>${isAng ? 'Name' : 'Nom'}</th><th>${isAng ? 'Relation' : 'Lien'}</th><th>${isAng ? 'Phone' : 'Téléphone'}</th></tr></thead>
    <tbody>${parentsRows}</tbody></table>
  </div>` : ''}

  <div class="signatures" style="margin-top:28px">
    <div class="sig-block"><div class="sig-line">${isAng ? 'Parent / Guardian' : 'Le parent / tuteur'}</div></div>
    <div class="sig-block"><div class="sig-line">${escapeHtml(data.ecole.directeur_nom) || (isAng ? 'The Principal' : 'Le Directeur')}</div></div>
  </div>

  <p class="footer-note">${isAng ? 'Document generated by SchoolManager' : 'Document généré par SchoolManager'}</p>
</body>
</html>`
}
