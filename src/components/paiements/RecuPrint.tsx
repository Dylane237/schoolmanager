'use client'

import { useRef } from 'react'
import { Printer, X } from 'lucide-react'

export interface RecuData {
  numero: string
  ecole?: string
  directeur?: string
  eleve_nom?: string
  eleve_prenom?: string
  matricule?: string
  classe?: string
  tranche?: number | string
  montant?: number | string
  mode?: string
  date?: string
}

const MODE_LABELS: Record<string, string> = {
  especes: 'Espèces',
  orange_money: 'Orange Money',
  mtn_momo: 'MTN MoMo',
  virement: 'Virement',
}

interface RecuPrintProps {
  recu: RecuData
  onClose: () => void
}

export default function RecuPrint({ recu, onClose }: RecuPrintProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return

    const win = window.open('', '_blank', 'width=600,height=800')
    if (!win) return

    win.document.write(`
      <!DOCTYPE html>
      <html><head>
        <title>Reçu ${recu.numero}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Georgia, serif; padding: 32px; color: #1e293b; font-size: 14px; }
          .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { font-size: 20px; color: #10b981; }
          .header p { font-size: 12px; color: #64748b; margin-top: 4px; }
          .recu-num { font-family: monospace; font-size: 13px; color: #64748b; margin-top: 8px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          td { padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
          td:first-child { color: #64748b; width: 40%; }
          td:last-child { font-weight: 600; text-align: right; }
          .montant { font-size: 22px; font-weight: bold; color: #10b981; text-align: center; margin: 24px 0; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; }
          .sig { border-top: 1px solid #cbd5e1; padding-top: 8px; width: 45%; text-align: center; font-size: 12px; color: #64748b; }
          @media print { body { padding: 16px; } }
        </style>
      </head><body>
        ${content.innerHTML}
      </body></html>
    `)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-lg text-slate-800">Reçu de paiement</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div ref={printRef} className="p-6">
          <div className="header text-center border-b-2 border-emerald-500 pb-4 mb-6">
            <h1 className="text-xl font-bold text-emerald-600">{recu.ecole || 'Établissement scolaire'}</h1>
            <p className="text-sm text-slate-500 mt-1">Reçu de paiement des frais de scolarité</p>
            <p className="recu-num font-mono text-sm text-slate-400 mt-2">N° {recu.numero}</p>
          </div>

          <table className="w-full text-base">
            <tbody>
              <tr><td className="text-slate-500 py-2">Élève</td><td className="font-semibold text-right">{recu.eleve_nom} {recu.eleve_prenom}</td></tr>
              <tr><td className="text-slate-500 py-2">Matricule</td><td className="font-mono text-right">{recu.matricule}</td></tr>
              <tr><td className="text-slate-500 py-2">Classe</td><td className="text-right">{recu.classe || '—'}</td></tr>
              <tr><td className="text-slate-500 py-2">Tranche</td><td className="text-right">Tranche {recu.tranche}</td></tr>
              <tr><td className="text-slate-500 py-2">Mode</td><td className="text-right">{MODE_LABELS[recu.mode || ''] || recu.mode}</td></tr>
              <tr><td className="text-slate-500 py-2">Date</td><td className="text-right">{recu.date}</td></tr>
            </tbody>
          </table>

          <p className="montant text-2xl font-bold text-emerald-600 text-center my-6">
            {Number(recu.montant).toLocaleString('fr-FR')} FCFA
          </p>

          <div className="footer flex justify-between mt-10">
            <div className="sig border-t border-slate-300 pt-2 w-[45%] text-center text-sm text-slate-500">
              Signature caissier
            </div>
            <div className="sig border-t border-slate-300 pt-2 w-[45%] text-center text-sm text-slate-500">
              {recu.directeur || 'Le Directeur'}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-lg py-3 text-base hover:bg-slate-50 transition-colors">
            Fermer
          </button>
          <button onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg py-3 text-base transition-colors">
            <Printer className="w-4 h-4" />
            Imprimer
          </button>
        </div>
      </div>
    </div>
  )
}
