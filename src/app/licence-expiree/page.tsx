import Link from 'next/link'
import { ShieldAlert, Mail, ArrowLeft } from 'lucide-react'

export default function LicenceExpireePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl mb-5">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Licence expirée</h1>
          <p className="text-slate-400 text-base leading-relaxed">
            L&apos;abonnement de votre établissement n&apos;est plus actif.
            Renouvelez votre licence pour retrouver l&apos;accès à toutes les fonctionnalités.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="text-white font-semibold text-lg mb-4">Comment renouveler ?</h2>
          <ol className="space-y-3 text-slate-300 text-base">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center justify-center shrink-0">1</span>
              Contactez votre représentant SchoolManager
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center justify-center shrink-0">2</span>
              Recevez votre nouvelle clé de licence
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center justify-center shrink-0">3</span>
              Votre accès sera réactivé immédiatement
            </li>
          </ol>

          <a href="mailto:support@schoolmanager.cm"
            className="mt-6 flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl px-5 py-3.5 transition-colors">
            <Mail className="w-5 h-5" />
            Contacter le support
          </a>
        </div>

        <Link href="/login"
          className="mt-6 flex items-center justify-center gap-2 text-slate-400 hover:text-white text-base transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </Link>
      </div>
    </div>
  )
}
