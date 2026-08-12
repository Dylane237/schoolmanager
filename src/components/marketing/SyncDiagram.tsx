import { getTranslations } from 'next-intl/server'
import { Monitor, Cloud, Smartphone } from 'lucide-react'

export async function SyncDiagram() {
  const t = await getTranslations('marketing.sync')

  const nodes = [
    { icon: Monitor, title: t('desktop'), hint: t('desktopHint'), color: 'bg-blue-500' },
    { icon: Cloud, title: t('cloud'), hint: t('cloudHint'), color: 'bg-emerald-500' },
    { icon: Smartphone, title: t('mobile'), hint: t('mobileHint'), color: 'bg-violet-500' },
  ]

  return (
    <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center">
      {nodes.map((node, i) => {
        const Icon = node.icon
        return (
          <div key={node.title} className="flex items-center gap-4">
            <div className="flex flex-1 flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:min-w-[160px]">
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${node.color} text-white shadow-lg`}>
                <Icon className="h-6 w-6" />
              </div>
              <p className="font-semibold text-slate-800">{node.title}</p>
              <p className="mt-1 text-xs text-slate-500">{node.hint}</p>
            </div>
            {i < nodes.length - 1 && (
              <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-center">
                <div className="h-0.5 w-8 bg-gradient-to-r from-emerald-400 to-emerald-500" />
              </div>
            )}
            {i < nodes.length - 1 && (
              <div className="flex justify-center sm:hidden">
                <div className="h-6 w-0.5 bg-gradient-to-b from-emerald-400 to-emerald-500" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
