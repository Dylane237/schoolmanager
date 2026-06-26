'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { EleveSituation, TrancheSituation } from '@/lib/paiements-utils'

const STATUT_STYLES = {
  paye: 'bg-emerald-100 text-emerald-700',
  partiel: 'bg-amber-100 text-amber-700',
  impaye: 'bg-red-100 text-red-700',
  non_configure: 'bg-slate-100 text-slate-600',
}

const STATUT_LABELS = {
  paye: 'Soldé',
  partiel: 'Partiel',
  impaye: 'Impayé',
  non_configure: 'Non configuré',
}

const MODE_LABELS: Record<string, string> = {
  especes: 'Espèces',
  orange_money: 'Orange Money',
  mtn_momo: 'MTN MoMo',
  virement: 'Virement',
}

function TrancheRow({ tranche }: { tranche: TrancheSituation }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
        <span className="text-sm font-semibold text-slate-700 w-24">Tranche {tranche.tranche_numero}</span>
        <span className="text-sm text-slate-500 flex-1">
          {Number(tranche.montant_paye).toLocaleString('fr-FR')} / {Number(tranche.montant_attendu).toLocaleString('fr-FR')} FCFA
        </span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUT_STYLES[tranche.statut]}`}>
          {STATUT_LABELS[tranche.statut]}
        </span>
        {tranche.reste > 0 && (
          <span className="text-sm font-semibold text-red-600 w-28 text-right">
            −{Number(tranche.reste).toLocaleString('fr-FR')}
          </span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 bg-slate-50/80 border-t border-slate-100">
          <div className="grid grid-cols-3 gap-3 py-3 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Attendu</p>
              <p className="font-semibold text-slate-700">{Number(tranche.montant_attendu).toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Payé</p>
              <p className="font-semibold text-emerald-600">{Number(tranche.montant_paye).toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Reste</p>
              <p className={`font-semibold ${tranche.reste > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {Number(tranche.reste).toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>

          {tranche.date_limite && (
            <p className="text-xs text-slate-500 mb-3">Date limite : {tranche.date_limite}</p>
          )}

          {tranche.historique.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Aucun paiement enregistré pour cette tranche</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase">
                  <th className="text-left py-1.5">Date</th>
                  <th className="text-left py-1.5">Reçu</th>
                  <th className="text-left py-1.5">Mode</th>
                  <th className="text-right py-1.5">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {tranche.historique.map(h => (
                  <tr key={h.id}>
                    <td className="py-2 text-slate-600">{h.date_paiement}</td>
                    <td className="py-2 font-mono text-xs text-slate-500">{h.recu_numero}</td>
                    <td className="py-2 text-slate-600">{MODE_LABELS[h.mode_paiement] ?? h.mode_paiement}</td>
                    <td className="py-2 text-right font-semibold text-slate-800">
                      {Number(h.montant).toLocaleString('fr-FR')} FCFA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function EleveSituationRow({ situation }: { situation: EleveSituation }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        {open
          ? <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
          : <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-base truncate">
            {situation.nom} {situation.prenom}
          </p>
          <p className="text-sm text-slate-400 truncate">
            {situation.numero_matricule} — {situation.classe_nom ?? 'Sans classe'}
          </p>
        </div>
        <div className="hidden sm:block text-right w-32">
          <p className="text-xs text-slate-400">Payé</p>
          <p className="text-sm font-semibold text-emerald-600">
            {Number(situation.total_paye).toLocaleString('fr-FR')}
          </p>
        </div>
        <div className="hidden sm:block text-right w-32">
          <p className="text-xs text-slate-400">Reste</p>
          <p className={`text-sm font-semibold ${situation.total_reste > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {Number(situation.total_reste).toLocaleString('fr-FR')}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${STATUT_STYLES[situation.statut]}`}>
          {STATUT_LABELS[situation.statut]}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 pl-14 space-y-2">
          {situation.tranches.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">
              Aucune tranche configurée pour la classe de cet élève. Configurez les tranches dans Paramètres.
            </p>
          ) : (
            situation.tranches.map(t => (
              <TrancheRow key={t.tranche_numero} tranche={t} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface SituationParEleveProps {
  situations: EleveSituation[]
  loading: boolean
  filtreStatut: string
  onFiltreStatutChange: (v: string) => void
}

export default function SituationParEleve({
  situations,
  loading,
  filtreStatut,
  onFiltreStatutChange,
}: SituationParEleveProps) {
  const filtered = filtreStatut === 'tous'
    ? situations
    : situations.filter(s => s.statut === filtreStatut)

  return (
    <div>
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-slate-600">Filtrer :</label>
        <select
          value={filtreStatut}
          onChange={e => onFiltreStatutChange(e.target.value)}
          className="input-field w-auto min-w-[160px]"
        >
          <option value="tous">Tous les élèves</option>
          <option value="impaye">Impayés</option>
          <option value="partiel">Paiement partiel</option>
          <option value="paye">Soldés</option>
          <option value="non_configure">Non configurés</option>
        </select>
        <span className="text-sm text-slate-400">{filtered.length} élève(s)</span>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Aucun élève trouvé</div>
        ) : (
          filtered.map(s => <EleveSituationRow key={s.eleve_id} situation={s} />)
        )}
      </div>
    </div>
  )
}
