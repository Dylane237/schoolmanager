'use client'

import { useState } from 'react'
import { Printer, X, Loader2, ExternalLink } from 'lucide-react'

interface RecuPrintProps {
  /** ID du paiement — sert à appeler la route qui génère le reçu HTML côté serveur. */
  paiementId: string
  /** Numéro de reçu, uniquement pour l'affichage dans la modale (ex: "REC-2026-00002"). */
  numero?: string
  onClose: () => void
}

// URL confirmée dans paiements/page.tsx (l'ancien fetch y pointait déjà,
// simplement avec un traitement JSON incorrect — voir plus bas).
function getRecuUrl(paiementId: string) {
  return `/api/paiements/recu?id=${paiementId}`
}

export default function RecuPrint({ paiementId, numero, onClose }: RecuPrintProps) {
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // On récupère le HTML via fetch() depuis la fenêtre PRINCIPALE (donc déjà
  // authentifiée, cookie sm_token inclus), puis on l'injecte dans une popup
  // vide. On ne fait PAS naviguer la popup directement vers l'URL protégée :
  // en Electron, une fenêtre ouverte via window.open(url) peut atterrir
  // dans une session/partition différente qui ne porte pas le cookie
  // d'authentification, d'où l'erreur "Non autorisé" observée.
  const handleOpen = async () => {
    setError(null)
    setOpening(true)

    try {
      const res = await fetch(getRecuUrl(paiementId), { credentials: 'include' })

      if (!res.ok) {
        let message = `Erreur ${res.status} lors de la génération du reçu.`
        try {
          const data = await res.json()
          if (data?.error) message = data.error
        } catch {
          // Réponse non-JSON (ex: erreur serveur brute) : on garde le message générique.
        }
        setError(message)
        setOpening(false)
        return
      }

      const html = await res.text()
      const win = window.open('', '_blank', 'width=850,height=1000')
      if (!win) {
        setError("Le navigateur a bloqué l'ouverture du reçu (popup). Autorisez les popups pour ce site puis réessayez.")
        setOpening(false)
        return
      }
      win.document.write(html)
      win.document.close()
    } catch {
      setError('Erreur réseau lors de la génération du reçu.')
    } finally {
      setOpening(false)
    }
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

        <div className="p-6 text-center">
          {numero && (
            <p className="font-mono text-sm text-slate-400 mb-2">N° {numero}</p>
          )}
          <p className="text-sm text-slate-500 mb-1">
            Le reçu s&apos;ouvre dans un nouvel onglet, avec l&apos;original et le duplicata prêts à imprimer sur une même page.
          </p>
          {error && (
            <p className="text-sm text-red-600 mt-3">{error}</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 font-semibold rounded-lg py-3 text-base hover:bg-slate-50 transition-colors">
            Fermer
          </button>
          <button onClick={handleOpen} disabled={opening}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg py-3 text-base transition-colors disabled:opacity-50">
            {opening
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <ExternalLink className="w-4 h-4" />
            }
            Ouvrir le reçu
          </button>
        </div>
      </div>
    </div>
  )
}