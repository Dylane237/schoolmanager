

export interface ClassListStudent {
  numero_matricule: string
  nom: string
  prenom: string
  sexe: string
  date_naissance?: string | null
  parent_telephone?: string | null
}

export interface ClassListExportData {
  ecoleNom: string
  classeNom: string
  section: string
  anneeScolaire: string
  enseignant?: string | null
  eleves: ClassListStudent[]
  exportedAt: string
}

export function buildClassListHtml(data: ClassListExportData): string {
  const rows = data.eleves.map((el, i) => `
    <tr>
      <td style="text-align:center;padding:6px 8px;border:1px solid #cbd5e1">${i + 1}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-family:monospace;font-size:12px">${el.numero_matricule}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-weight:600">${el.nom}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1">${el.prenom}</td>
      <td style="text-align:center;padding:6px 8px;border:1px solid #cbd5e1">${el.sexe === 'M' ? 'G' : el.sexe === 'F' ? 'F' : '—'}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:12px">${el.date_naissance || '—'}</td>
      <td style="padding:6px 8px;border:1px solid #cbd5e1;font-size:12px">${el.parent_telephone || '—'}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Liste ${data.classeNom} — ${data.ecoleNom}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 24px 32px; color: #0f172a; font-size: 13px; }
    .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 16px; margin-bottom: 20px; }
    .header h1 { font-size: 22px; color: #059669; margin-bottom: 4px; }
    .header h2 { font-size: 16px; color: #334155; margin-bottom: 8px; }
    .meta { display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; }
    .footer { margin-top: 32px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
    .sig { border-top: 1px solid #94a3b8; padding-top: 8px; width: 40%; text-align: center; margin-top: 48px; }
    @media print {
      body { padding: 12px 16px; }
      @page { margin: 1.5cm; size: A4 portrait; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.ecoleNom}</h1>
    <h2>Liste des élèves — ${data.classeNom}</h2>
    <p style="font-size:12px;color:#64748b">${data.section} · Année scolaire ${data.anneeScolaire}${data.enseignant ? ` · Titulaire : ${data.enseignant}` : ''}</p>
  </div>
  <div class="meta">
    <span>Effectif : <strong>${data.eleves.length}</strong> élève(s)</span>
    <span>Exporté le ${data.exportedAt}</span>
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

export function buildFicheEleveHtml(data: {
  ecoleNom: string
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
}): string {
  const parentsRows = data.parents.map(p => `
    <tr><td>${p.nom} ${p.prenom ?? ''}</td><td>${p.lien}</td><td>${p.telephone}</td></tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr"><head>
  <meta charset="UTF-8">
  <title>Fiche — ${data.eleve.nom} ${data.eleve.prenom}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #0f172a; font-size: 14px; max-width: 800px; margin: 0 auto; }
    h1 { color: #059669; font-size: 24px; margin-bottom: 4px; }
    .sub { color: #64748b; font-family: monospace; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .box h3 { font-size: 12px; text-transform: uppercase; color: #64748b; margin-bottom: 12px; letter-spacing: 0.05em; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
    .stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-bottom: 24px; }
    .stat { text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px; }
    .stat .val { font-size: 20px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td, th { padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; }
    @media print { body { padding: 16px; } }
  </style>
</head><body>
  <h1>${data.eleve.nom} ${data.eleve.prenom}</h1>
  <p class="sub">${data.eleve.numero_matricule} · ${data.ecoleNom}</p>
  <div class="stats">
    <div class="stat"><div class="val">${data.situation.total_paye.toLocaleString('fr-FR')} F</div><div>Payé</div></div>
    <div class="stat"><div class="val">${data.moyenne ?? '—'}</div><div>Moyenne</div></div>
    <div class="stat"><div class="val">${data.tauxPresence !== null ? data.tauxPresence + '%' : '—'}</div><div>Présence</div></div>
  </div>
  <div class="grid">
    <div class="box">
      <h3>Identité</h3>
      <div class="row"><span>Sexe</span><strong>${data.eleve.sexe === 'M' ? 'Masculin' : 'Féminin'}</strong></div>
      <div class="row"><span>Naissance</span><strong>${data.eleve.date_naissance || '—'}</strong></div>
      <div class="row"><span>Lieu</span><strong>${data.eleve.lieu_naissance || '—'}</strong></div>
      <div class="row"><span>Classe</span><strong>${data.eleve.classe_nom || '—'}</strong></div>
      <div class="row"><span>Section</span><strong>${data.eleve.section}</strong></div>
      <div class="row"><span>Statut annuel</span><strong>${data.eleve.statut_annuel || '—'}</strong></div>
    </div>
    <div class="box">
      <h3>Scolarité & paiements</h3>
      <div class="row"><span>Année entrée</span><strong>${data.eleve.annee_entree || '—'}</strong></div>
      <div class="row"><span>Total attendu</span><strong>${data.situation.total_attendu.toLocaleString('fr-FR')} F</strong></div>
      <div class="row"><span>Reste dû</span><strong style="color:${data.situation.total_reste > 0 ? '#dc2626' : '#059669'}">${data.situation.total_reste.toLocaleString('fr-FR')} F</strong></div>
      <div class="row"><span>Statut paiement</span><strong>${data.situation.statut}</strong></div>
    </div>
  </div>
  ${data.parents.length ? `
  <div class="box">
    <h3>Parents / Tuteurs</h3>
    <table><thead><tr><th>Nom</th><th>Lien</th><th>Téléphone</th></tr></thead>
    <tbody>${parentsRows}</tbody></table>
  </div>` : ''}
  <p style="margin-top:32px;font-size:11px;color:#94a3b8;text-align:center">Document généré par SchoolManager</p>
</body></html>`
}
