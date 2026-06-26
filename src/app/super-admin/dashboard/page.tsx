import { cookies } from 'next/headers'

export default async function SuperAdminDashboard() {
  const cookieStore = await cookies()
  const token = cookieStore.get('sm_token')?.value

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/super-admin/stats`, {
    headers: { Cookie: `sm_token=${token}` },
    cache: 'no-store',
  })
  const data = await res.json()
  const { stats, business, ecoles } = data

  const licenceColor = (fin: string, active: number) => {
    if (!active) return 'bg-red-100 text-red-700'
    const days = Math.floor((new Date(fin).getTime() - Date.now()) / 86400000)
    if (days < 0)  return 'bg-red-100 text-red-700'
    if (days < 30) return 'bg-amber-100 text-amber-700'
    return 'bg-emerald-100 text-emerald-700'
  }

  const licenceLabel = (fin: string, active: number) => {
    if (!active) return 'Inactive'
    const days = Math.floor((new Date(fin).getTime() - Date.now()) / 86400000)
    if (days < 0)  return 'Expirée'
    if (days < 30) return `Expire dans ${days}j`
    return 'Active'
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">Vue globale</h1>
        <p className="page-subtitle">Pilotage commercial et opérationnel</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Écoles clientes', value: stats?.totalEcoles ?? 0 },
          { label: 'Élèves total', value: stats?.totalEleves ?? 0 },
          { label: 'Licences actives', value: stats?.licencesActives ?? 0 },
          { label: 'Expirent sous 30j', value: stats?.licencesExpirant ?? 0 },
        ].map((s, i) => (
          <div key={i} className="card p-6">
            <p className="text-base text-slate-500 mb-2">{s.label}</p>
            <p className="text-3xl font-bold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-slate-800 mb-4">Indicateurs business</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="card p-6 border-emerald-200 bg-emerald-50/50">
          <p className="text-base text-slate-500 mb-2">Chiffre d&apos;affaires licences</p>
          <p className="text-2xl font-bold text-emerald-700">
            {(stats?.chiffreAffaires ?? 0).toLocaleString('fr-FR')} FCFA
          </p>
        </div>
        <div className="card p-6">
          <p className="text-base text-slate-500 mb-2">Nouvelles écoles ce mois</p>
          <p className="text-2xl font-bold text-slate-800">{stats?.nouvellesEcolesMois ?? 0}</p>
        </div>
        <div className="card p-6">
          <p className="text-base text-slate-500 mb-2">Taux de conversion</p>
          <p className="text-2xl font-bold text-slate-800">{stats?.tauxConversion ?? 0}%</p>
        </div>
        <div className="card p-6">
          <p className="text-base text-slate-500 mb-2">Licences expirées</p>
          <p className="text-2xl font-bold text-red-600">{stats?.licencesExpirees ?? 0}</p>
        </div>
      </div>

      {business?.plans?.length > 0 && (
        <div className="card mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 text-lg">Répartition par plan</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Plan', 'Licences actives', 'Revenu estimé'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-sm font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {business.plans.map((p: { plan: string; count: number; revenu: number }) => (
                <tr key={p.plan} className="hover:bg-slate-50">
                  <td className="px-4 py-3 capitalize font-semibold text-base">{p.plan}</td>
                  <td className="px-4 py-3 text-base">{p.count}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-700 text-base">
                    {p.revenu.toLocaleString('fr-FR')} FCFA
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {business?.renouvellements30j?.length > 0 && (
        <div className="card mb-8 overflow-hidden border-amber-200">
          <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
            <h2 className="font-semibold text-amber-800 text-lg">Renouvellements à venir (30 jours)</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['École', 'Plan', 'Expiration'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-sm font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {business.renouvellements30j.map((l: { id: string; ecole_nom: string; type: string; date_fin: string }) => (
                <tr key={l.id} className="hover:bg-amber-50/50">
                  <td className="px-4 py-3 font-semibold text-base">{l.ecole_nom}</td>
                  <td className="px-4 py-3 capitalize text-base">{l.type}</td>
                  <td className="px-4 py-3 text-amber-700 font-medium text-base">{l.date_fin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-800 text-lg">Écoles clientes</h2>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['École', 'Slug', 'Élèves', 'Plan', 'Licence', 'Expiration'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-sm font-semibold text-slate-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ecoles?.map((e: Record<string, unknown>) => (
              <tr key={e.id as string} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800 text-base">{e.nom as string}</p>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-slate-500">{e.slug as string}</td>
                <td className="px-4 py-3 text-base text-slate-600">{e.nb_eleves as number}</td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">
                    {(e.licence_type as string) || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${licenceColor(e.licence_fin as string, e.licence_active as number)}`}>
                    {e.licence_fin ? licenceLabel(e.licence_fin as string, e.licence_active as number) : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-base text-slate-500">{(e.licence_fin as string) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
