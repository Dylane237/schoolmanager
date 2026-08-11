import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { getDb } from '../../../../lib/db-server'
import { JWT_SECRET } from '../../../../lib/jwt'
import { escapeHtml } from '../../../../lib/html-escape'
import { buildRecuHeaderHtml } from '../../../../lib/school-documents'
import { requireModule } from '../../../../lib/rbac.server'

async function getUser(request: NextRequest) {
  const token = request.cookies.get('sm_token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as any
  } catch { return null }
}

function numberToWords(n: number): string {
  if (n === 0) return 'zéro'
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']
  let result = ''
  if (n >= 1000000) { result += numberToWords(Math.floor(n / 1000000)) + ' million '; n %= 1000000 }
  if (n >= 1000) { const m = Math.floor(n / 1000); result += (m === 1 ? 'mille ' : numberToWords(m) + ' mille '); n %= 1000 }
  if (n >= 100) { const m = Math.floor(n / 100); result += (m === 1 ? 'cent ' : numberToWords(m) + ' cent '); n %= 100 }
  if (n >= 20) {
    const t = Math.floor(n / 10); const u = n % 10
    if (t === 7 || t === 9) result += tens[t] + '-' + units[10 + u] + ' '
    else result += tens[t] + (u > 0 ? '-' + units[u] : '') + ' '
  } else if (n > 0) result += units[n] + ' '
  return result.trim()
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function generateRecu(data: any, copy: 'ORIGINAL' | 'DUPLICATA'): string {
  const montantLettre = numberToWords(Math.round(data.montant))
  const montantLettreFormatted = montantLettre.charAt(0).toUpperCase() + montantLettre.slice(1) + ' francs CFA'
  const reste = Math.max(0, (data.total_scolarite || 0) - (data.total_paye || 0))
  const objets: Record<number, string> = {
    1: 'Inscription (1ère tranche)',
    2: '2ème tranche de scolarité',
    3: '3ème tranche de scolarité',
    4: '4ème tranche de scolarité',
  }
  const objet = objets[data.tranche_numero] || `Tranche ${data.tranche_numero}`
  const now = new Date()
  const dateHeure = `${formatDate(data.date_paiement)} — ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  const enteteSection = buildRecuHeaderHtml({
    nom: data.ecole_nom,
    adresse: data.ecole_adresse,
    telephone: data.ecole_telephone,
    email: data.ecole_email,
    entete_url: data.entete_url,
  })

  return `
    <div class="recu">
      <!-- EN-TETE -->
      ${enteteSection}

      <div class="line-full"></div>

      <!-- NUMERO RECU A DROITE + ORIGINAL/DUPLICATA -->
      <div class="recu-meta">
        <div class="recu-date">${dateHeure}</div>
        <div class="recu-num-block">
          <div class="recu-num">N° Reçu : <strong>${escapeHtml(data.recu_numero)}</strong></div>
          <div class="recu-copy ${copy === 'ORIGINAL' ? 'rouge' : ''}">${copy}</div>
        </div>
      </div>

      <div class="line-full"></div>

      <!-- INFORMATIONS ELEVE -->
      <table class="ligne-table">
        <tr>
          <td class="lbl">Matricule :</td>
          <td class="val">${escapeHtml(data.numero_matricule) || '—'}</td>
        </tr>
        <tr>
          <td class="lbl">Nom et Prénom(s) :</td>
          <td class="val"><strong>${escapeHtml(data.eleve_nom)} ${escapeHtml(data.eleve_prenom)}</strong></td>
        </tr>
        <tr>
          <td class="lbl">Date et lieu de naissance :</td>
          <td class="val">${formatDate(data.date_naissance)} &nbsp;à&nbsp; ${escapeHtml(data.lieu_naissance) || '—'}</td>
        </tr>
        <tr>
          <td class="lbl">Classe :</td>
          <td class="val">${escapeHtml(data.classe_nom) || '—'}</td>
        </tr>
        <tr>
          <td class="lbl">Objet :</td>
          <td class="val">${escapeHtml(objet)}</td>
        </tr>
      </table>

      <div class="line-full"></div>

      <!-- MONTANTS -->
      <table class="ligne-table">
        <tr>
          <td class="lbl">Montant payé :</td>
          <td class="val"><strong>${Math.round(data.montant).toLocaleString('fr-FR')}F &nbsp; Total = ${Math.round(data.total_paye || 0).toLocaleString('fr-FR')}F</strong></td>
        </tr>
        <tr>
          <td class="lbl">En toutes lettres :</td>
          <td class="val italic">(${montantLettreFormatted})</td>
        </tr>
        <tr>
          <td class="lbl">Reste à payer :</td>
          <td class="val ${reste > 0 ? 'rouge' : ''}"><strong>Scolarité = ${reste.toLocaleString('fr-FR')}F CFA</strong></td>
        </tr>
      </table>

      <!-- SIGNATURE -->
      <div class="signature-row">
        <!-- Emplacement de l'ex-cachet : conservé vide pour garder la hauteur/l'espacement d'origine -->
        <div class="cachet-block" aria-hidden="true"></div>
        <div class="caisse-block">
          <div class="caisse-label">La caisse</div>
          <div class="caisse-nom">${escapeHtml(data.nom_caissier)}</div>
        </div>
      </div>
    </div>
  `
}

export async function GET(request: NextRequest) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const denied = requireModule(user, 'paiements', 'GET')
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const paiement_id = searchParams.get('id')
  if (!paiement_id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  const db = getDb()

  const paiement = db.prepare(`
    SELECT
      p.*,
      e.nom        as eleve_nom,
      e.prenom     as eleve_prenom,
      e.date_naissance,
      e.lieu_naissance,
      e.numero_matricule,
      c.nom        as classe_nom,
      ec.nom       as ecole_nom,
      ec.adresse   as ecole_adresse,
      ec.telephone as ecole_telephone,
      ec.email     as ecole_email,
      ec.entete_url,
      ec.nom_caissier,
      COALESCE((
        SELECT SUM(p2.montant) FROM paiements p2 WHERE p2.eleve_id = e.id
      ), 0) as total_paye,
      COALESCE((
        SELECT SUM(tc.montant_attendu)
        FROM tranches_config tc
        WHERE tc.classe_id = e.classe_id
          AND tc.annee_scolaire = (
            SELECT label FROM annees_scolaires
            WHERE ecole_id = p.ecole_id AND is_active = 1
            LIMIT 1
          )
      ), 0) as total_scolarite
    FROM paiements p
    LEFT JOIN eleves e  ON e.id  = p.eleve_id
    LEFT JOIN classes c ON c.id  = e.classe_id
    LEFT JOIN ecoles ec ON ec.id = p.ecole_id
    WHERE p.id = ? AND p.ecole_id = ?
  `).get(paiement_id, user.ecole_id) as any

  if (!paiement) {
    return NextResponse.json({ error: 'Paiement introuvable' }, { status: 404 })
  }

  const recuOriginal  = generateRecu(paiement, 'ORIGINAL')
  const recuDuplicata = generateRecu(paiement, 'DUPLICATA')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; font-family: Arial, Helvetica, sans-serif; }
  body { font-size: 12px; background: white; color: #000; }

  @page { size: A4 portrait; margin: 8mm 10mm; }

  .page { width: 100%; }

  .recu {
    width: 100%;
    padding: 10px 14px;
    border: 1.5px solid #222;
    background: white;
    page-break-inside: avoid;
  }

  .entete {
    width: 100%;
    height: 110px;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .entete img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    display: block;
  }

  .recu-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin: 6px 0;
  }
  .recu-date { font-size: 11px; color: #444; }
  .recu-num-block { text-align: right; }
  .recu-num { font-size: 12px; font-weight: bold; }
  .recu-copy {
    font-size: 13px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 2px;
  }

  .line-full {
    border-top: 1.5px solid #222;
    margin: 6px 0;
  }

  .ligne-table { width: 100%; border-collapse: collapse; }
  .ligne-table tr td { padding: 3px 4px; vertical-align: top; }
  .lbl { color: #333; width: 40%; font-size: 12px; }
  .val { color: #000; font-size: 12px; }
  .italic { font-style: italic; }
  .rouge { color: #cc0000; }

  .signature-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 16px;
    padding-top: 6px;
  }

  /* Emplacement laissé par l'ex-cercle de cachet : mêmes dimensions,
     invisible, uniquement pour préserver la hauteur/l'espacement de la ligne. */
  .cachet-block {
    width: 70px;
    height: 70px;
  }

  .caisse-block {
    text-align: right;
    /* Remonte le bloc d'environ deux interlignes sans toucher aux
       marges/paddings de .signature-row qui restent inchangés. */
    position: relative;
    top: -2.4em;
  }
  .caisse-label { font-size: 11px; font-style: italic; color: #555; margin-bottom: 2px; }
  .caisse-nom { font-size: 13px; font-weight: bold; }

  /* SEPARATEUR ENTRE LES DEUX COPIES */
  .separateur {
    display: flex;
    align-items: center;
    margin: 6mm 0;
    gap: 6px;
  }
  .separateur-ligne {
    flex: 1;
    border-top: 2px dashed #888;
  }
  .separateur-icon {
    font-size: 16px;
    color: #666;
    line-height: 1;
  }

  @media print {
    body { margin: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="no-print" style="padding:12px;background:#f0fdf4;border-bottom:1px solid #86efac;display:flex;align-items:center;justify-content:space-between;">
    <span style="font-size:13px;color:#166534;">Reçu N° ${escapeHtml(paiement.recu_numero)} — Prêt à imprimer</span>
    <button onclick="window.print()" style="background:#10b981;color:white;border:none;padding:8px 20px;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600;">Imprimer</button>
  </div>

  <div class="page">
    ${recuOriginal}

    <div class="separateur">
      <div class="separateur-ligne"></div>
      <div class="separateur-icon">✂</div>
      <div class="separateur-ligne"></div>
    </div>

    ${recuDuplicata}
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}