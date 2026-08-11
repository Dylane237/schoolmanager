import { buildDocumentHeaderHtml, DOCUMENT_BASE_STYLES, getDocumentTitle, type DocumentSection, type EcoleDocumentInfo } from './school-documents'
import { escapeHtml } from './html-escape'

export interface ClassListStudent {
  numero_matricule: string
  nom: string
  prenom: string
  sexe: string
  date_naissance?: string | null
  parent_telephone?: string | null
}

export interface ClassListExportData {
  ecole: EcoleDocumentInfo
  classeNom: string
  section: string
  anneeScolaire: string
  enseignant?: string | null
  eleves: ClassListStudent[]
  exportedAt: string
}

/** @deprecated Utilisez ecole.nom via ClassListExportData.ecole */
export interface ClassListExportDataLegacy {
  ecoleNom: string
  classeNom: string
  section: string
  anneeScolaire: string
  enseignant?: string | null
  eleves: ClassListStudent[]
  exportedAt: string
}

export function buildClassListHtml(data: ClassListExportData | ClassListExportDataLegacy): string {
  const ecole: EcoleDocumentInfo = 'ecole' in data
    ? data.ecole
    : { nom: data.ecoleNom }
  const section = data.section as DocumentSection
  const docTitle = getDocumentTitle(section, 'liste')
  const header = buildDocumentHeaderHtml(ecole, section, {
    documentTitle: docTitle,
    subtitle: `${data.classeNom}${data.enseignant ? ` · Titulaire : ${data.enseignant}` : ''}`,
    anneeScolaire: data.anneeScolaire,
  })
  const rows = data.eleves.map((el, i) => `
    <tr>
      <td style="text-align:center;padding:6px 8px;border:1px solid #cbd5e1">${i + 1}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-family:monospace;font-size:12px">${escapeHtml(el.numero_matricule)}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:600">${escapeHtml(el.nom)}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1">${escapeHtml(el.prenom)}</td>
      <td style="text-align:center;padding:6px 8px;border:1px solid #cbd5e1">${el.sexe === 'M' ? 'G' : el.sexe === 'F' ? 'F' : '—'}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:12px">${el.date_naissance || '—'}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:12px">${el.parent_telephone || '—'}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Liste ${escapeHtml(data.classeNom)} — ${escapeHtml(ecole.nom)}</title>
  <style>
    ${DOCUMENT_BASE_STYLES}
    body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px 32px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; }
    td { padding: 6px 8px; border: 1px solid #cbd5e1; }
    .meta { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 8px; }
    .footer { margin-top: 32px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
    .sig { border-top: 1px solid #94a3b8; padding-top: 8px; width: 40%; text-align: center; margin-top: 48px; }
  </style>
</head>
<body>
  ${header}
  <div class="meta">
    <span>Effectif : <strong>${data.eleves.length}</strong> élève(s)</span>
    <span>Exporté le ${escapeHtml(data.exportedAt)}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:40px">N°</th>
        <th>Matricule</th>
        <th>Nom</th>
        <th>Prénom</th>
        <th style="width:40px">S.</th>
        <th>Naissance</th>
        <th>Tél. parent</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="7" style="padding:24px;text-align:center;color:#94a3b8">Aucun élève</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <div class="sig">Signature du directeur</div>
    <div class="sig">Signature de l'enseignant titulaire</div>
  </div>
</body>
</html>`
}