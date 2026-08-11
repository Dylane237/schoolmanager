'use client'

import {
  getMinistryHeader,
  safeEnteteUrl,
  formatPeriodeLabel,
  getDocumentTitle,
  type DocumentSection,
} from '@/lib/school-documents'

interface EcoleInfo {
  nom: string
  directeur_nom?: string
  adresse?: string
  telephone?: string
  email?: string
  entete_url?: string | null
}

interface DocumentHeaderPreviewProps {
  ecole: EcoleInfo
  section: DocumentSection
  periode: string
  anneeScolaire?: string | null
  kind?: 'bulletin' | 'fiche'
}

export default function DocumentHeaderPreview({
  ecole,
  section,
  periode,
  anneeScolaire,
  kind = 'bulletin',
}: DocumentHeaderPreviewProps) {
  const enteteUrl = safeEnteteUrl(ecole.entete_url)
  const ministry = getMinistryHeader(section)
  const docTitle = getDocumentTitle(section, kind)
  const periodeLabel = formatPeriodeLabel(periode, section)
  const isAng = section === 'anglophone'

  if (enteteUrl) {
    return (
      <div className="text-center border-b-[3px] border-double border-slate-400 pb-4 mb-6">
        <img
          src={enteteUrl}
          alt="En-tête officielle"
          className="max-h-28 object-contain mx-auto mb-3"
        />
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">{docTitle}</h2>
        <p className="text-xs text-slate-500 mt-1">
          {isAng ? periodeLabel : `Du ${periodeLabel}`}
          {anneeScolaire && ` · Année scolaire ${anneeScolaire}`}
        </p>
      </div>
    )
  }

  const contacts = [ecole.adresse, ecole.telephone && `Tél : ${ecole.telephone}`, ecole.email && `E-mail : ${ecole.email}`]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="text-center border-b-[3px] border-double border-slate-400 pb-4 mb-6">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-700">{ministry.republique}</p>
      <p className="text-[10px] italic text-slate-500 mt-0.5">{ministry.devise}</p>
      <p className="text-[11px] font-bold uppercase text-slate-700 mt-1">{ministry.ministere}</p>
      <h1 className="text-lg font-bold uppercase tracking-wide text-slate-900 mt-2">{ecole.nom}</h1>
      {contacts && <p className="text-[10px] text-slate-500 mt-1">{contacts}</p>}
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 mt-3">{docTitle}</h2>
      <p className="text-xs text-slate-500 mt-1">
        {isAng ? periodeLabel : `Du ${periodeLabel}`}
        {anneeScolaire && ` · Année scolaire ${anneeScolaire}`}
      </p>
    </div>
  )
}
