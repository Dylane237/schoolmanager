'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, RefreshCw, Zap, Package } from 'lucide-react'
import toast from 'react-hot-toast'

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'

export default function AppUpdates() {
  const [version, setVersion] = useState<string | null>(null)
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isElectron, setIsElectron] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (!api?.getAppVersion) return

    let cancelled = false

    ;(async () => {
      try {
        const v = await api.getAppVersion()
        if (cancelled) return
        setIsElectron(true)
        setVersion(v)
      } catch {
        // Handler IPC absent (redémarrer Electron après mise à jour de main.js)
      }
    })()

    const unsub = api.onUpdateStatus?.((payload) => {
      setStatus(payload.status as UpdateStatus)
      if (payload.version) setUpdateVersion(payload.version)
      if (payload.progress !== undefined) setProgress(payload.progress)
      if (payload.error) setError(payload.error)
      else if (payload.status !== 'error') setError(null)
    })

    return () => {
      cancelled = true
      unsub?.()
    }
  }, [])

  const handleCheck = useCallback(async () => {
    const api = window.electronAPI
    if (!api?.checkForUpdates) return

    setError(null)
    setStatus('checking')
    try {
      const result = await api.checkForUpdates()
      if (result.error) {
        setStatus('error')
        setError(result.error)
        toast.error(result.error)
      }
    } catch {
      setStatus('error')
      setError('Impossible de vérifier les mises à jour')
      toast.error('Impossible de vérifier les mises à jour')
    }
  }, [])

  const handleDownload = async () => {
    const api = window.electronAPI
    if (!api?.downloadUpdate) return
    setStatus('downloading')
    await api.downloadUpdate()
  }

  const handleInstall = () => {
    window.electronAPI?.installUpdate?.()
  }

  if (!isElectron) return null

  return (
    <section className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
          <Package className="w-4 h-4 text-sky-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-800">Mises à jour de l&apos;application</h2>
          <p className="text-xs text-slate-400">
            Version {version || '—'} · Corrections et nouvelles fonctionnalités
          </p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {status === 'available' && updateVersion && (
          <div className="flex items-start gap-3 p-4 bg-sky-50 border border-sky-100 rounded-xl">
            <Zap className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-sky-800">
                Version {updateVersion} disponible
              </p>
              <p className="text-xs text-sky-700 mt-1">
                Téléchargez et installez pour bénéficier des dernières améliorations.
              </p>
            </div>
          </div>
        )}

        {status === 'downloaded' && (
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <Download className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Mise à jour prête</p>
              <p className="text-xs text-emerald-700 mt-1">
                Redémarrez l&apos;application pour appliquer la version {updateVersion}.
              </p>
            </div>
          </div>
        )}

        {status === 'downloading' && (
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Téléchargement...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          {(status === 'idle' || status === 'not-available' || status === 'error' || status === 'checking') && (
            <button
              type="button"
              onClick={handleCheck}
              disabled={status === 'checking'}
              className="btn-secondary flex items-center gap-2"
            >
              {status === 'checking' ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" /> Vérifier les mises à jour
                </>
              )}
            </button>
          )}

          {status === 'available' && (
            <button type="button" onClick={handleDownload} className="btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" /> Télécharger
            </button>
          )}

          {status === 'downloaded' && (
            <button type="button" onClick={handleInstall} className="btn-primary flex items-center gap-2">
              <Zap className="w-4 h-4" /> Redémarrer et installer
            </button>
          )}

          {status === 'not-available' && (
            <p className="text-sm text-slate-500 self-center">Vous utilisez la dernière version.</p>
          )}
        </div>
      </div>
    </section>
  )
}
