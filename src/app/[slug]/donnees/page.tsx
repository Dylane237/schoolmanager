'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Upload, Download, FileSpreadsheet, FileJson, FileText,
  Users, School, CreditCard, ClipboardList, CheckSquare, UserCheck,
  ArrowRight, DatabaseBackup, ExternalLink, Cloud, CloudUpload, RefreshCw,
} from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import { useSchool } from '@/components/layout/SchoolProvider'
import { useSyncStatusOptional } from '@/hooks/useSyncStatus'
import { hasModuleAccess, type Module } from '@/lib/rbac'
import { ENTITY_MODULES, type ExportEntity, type ExportFormat } from '@/lib/data-export/types'
import toast from 'react-hot-toast'
import SyncConflictPanel, { type ChangelogPayload } from '@/components/donnees/SyncConflictPanel'

const ENTITIES: ExportEntity[] = ['eleves', 'classes', 'paiements', 'notes', 'presences', 'personnel']

const ENTITY_ICONS = {
  eleves: Users,
  classes: School,
  paiements: CreditCard,
  notes: ClipboardList,
  presences: CheckSquare,
  personnel: UserCheck,
} as const

const FORMAT_META: Record<ExportFormat, { icon: typeof FileSpreadsheet; ext: string }> = {
  csv: { icon: FileSpreadsheet, ext: 'csv' },
  xlsx: { icon: FileSpreadsheet, ext: 'xlsx' },
  json: { icon: FileJson, ext: 'json' },
  pdf: { icon: FileText, ext: 'pdf' },
}

export default function DonneesPage() {
  const { slug } = useParams()
  const router = useRouter()
  const t = useTranslations('donnees')
  const { userRole } = useSchool()
  const [downloading, setDownloading] = useState<string | null>(null)

  const accessibleEntities = useMemo(
    () => ENTITIES.filter(e => hasModuleAccess(userRole, ENTITY_MODULES[e] as Module)),
    [userRole]
  )

  const canImport = hasModuleAccess(userRole, 'eleves')
  const canSync = hasModuleAccess(userRole, 'parametres')

  const [syncStatus, setSyncStatus] = useState<{
    synced: boolean
    synced_at: string | null
    eleves_count: number
    classes_count: number
    db_synced?: boolean
    sync_state?: string
    conflict?: boolean
    last_error?: string | null
  } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [compareKey, setCompareKey] = useState(0)
  const [comparePayload, setComparePayload] = useState<ChangelogPayload | null>(null)
  const syncPanelRef = useRef<HTMLDivElement>(null)
  const syncContext = useSyncStatusOptional()
  const tSync = useTranslations('sync')

  useEffect(() => {
    if (!canSync) return
    fetch('/api/sync/status')
      .then(r => r.json())
      .then(d => setSyncStatus(d))
      .catch(() => {})
  }, [canSync])

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync/compare', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || t('sync.error'))
        return
      }
      setComparePayload({
        conflict: Boolean(data.conflict),
        diff: data.diff,
        journal: data.journal,
      })
      setCompareKey(k => k + 1)
      syncPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      if (!data.diff?.has_differences) {
        toast.success(t('sync.alreadySynced'))
      } else {
        toast.success(t('sync.compareReady', { count: data.diff.items?.length ?? 0 }))
      }
      const statusRes = await fetch('/api/sync/status')
      setSyncStatus(await statusRes.json())
      await syncContext?.refresh()
    } catch {
      toast.error(t('sync.error'))
    } finally {
      setSyncing(false)
    }
  }

  const handleGlobalSync = async (strategy: 'keep_local' | 'keep_cloud') => {
    const confirmed = window.confirm(
      strategy === 'keep_cloud'
        ? tSync('confirmKeepCloudDestructive')
        : tSync('confirmKeepLocalDestructive'),
    )
    if (!confirmed) return
    setSyncing(true)
    try {
      const res = await fetch('/api/sync/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy, allow_destructive: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || t('sync.error'))
        return
      }
      toast.success(t('sync.success'))
      setComparePayload(null)
      setCompareKey(0)
      const statusRes = await fetch('/api/sync/status')
      setSyncStatus(await statusRes.json())
      await syncContext?.refresh()
    } catch {
      toast.error(t('sync.error'))
    } finally {
      setSyncing(false)
    }
  }

  const formatSyncDate = (iso: string | null) => {
    if (!iso) return t('sync.never')
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  const handleExport = async (entity: ExportEntity, format: ExportFormat) => {
    const key = `${entity}-${format}`
    setDownloading(key)
    try {
      const res = await fetch(`/api/data/export?entity=${entity}&format=${format}`)
      if (!res.ok) {
        toast.error(t('export.error'))
        return
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? `${entity}.${FORMAT_META[format].ext}`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t('export.error'))
    } finally {
      setDownloading(null)
    }
  }

  return (
    <PageShell title={t('title')} subtitle={t('subtitle')} breadcrumb={t('breadcrumb')}>
      <div className="space-y-10 max-w-5xl">
        {/* Cloud sync */}
        {canSync && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-emerald-600" />
              {t('sections.sync')}
            </h2>
            <div className="card p-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-800">{t('sync.title')}</h3>
                  <p className="text-sm text-slate-500 mt-1">{t('sync.description')}</p>
                  {syncStatus && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-slate-400 text-xs">{t('sync.lastSync')}</p>
                        <p className="font-medium text-slate-700 mt-0.5">{formatSyncDate(syncStatus.synced_at)}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-slate-400 text-xs">{t('sync.students')}</p>
                        <p className="font-medium text-slate-700 mt-0.5">{syncStatus.eleves_count}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-slate-400 text-xs">{t('sync.classes')}</p>
                        <p className="font-medium text-slate-700 mt-0.5">{syncStatus.classes_count}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-slate-400 text-xs">{t('sync.mode')}</p>
                        <p className="font-medium text-slate-700 mt-0.5">
                          {syncStatus.db_synced ? t('sync.modeSynced') : t('sync.modePending')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => handleSyncNow()}
                    disabled={syncing}
                    className="btn-primary flex items-center gap-2"
                  >
                    {syncing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CloudUpload className="w-4 h-4" />
                    )}
                    {syncing ? t('sync.syncing') : t('sync.action')}
                  </button>
                  <p className="text-xs text-slate-500 max-w-xs">
                    {t('sync.compareHint')}
                  </p>
                </div>
                {(syncStatus?.conflict || syncStatus?.sync_state === 'conflict') && (
                  <div className="flex flex-col gap-2 w-full sm:w-auto">
                    <p className="text-xs text-amber-700">{tSync('preferGranular')}</p>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
                        {tSync('advancedGlobalSync')}
                      </summary>
                      <div className="flex flex-col gap-2 mt-2">
                        <button
                          onClick={() => handleGlobalSync('keep_local')}
                          disabled={syncing}
                          className="btn-secondary text-sm"
                        >
                          {tSync('resolveKeepLocal')}
                        </button>
                        <button
                          onClick={() => handleGlobalSync('keep_cloud')}
                          disabled={syncing}
                          className="btn-secondary text-sm"
                        >
                          {tSync('resolveKeepCloud')}
                        </button>
                      </div>
                    </details>
                  </div>
                )}
              </div>
              <div ref={syncPanelRef}>
              <SyncConflictPanel
                compareKey={compareKey}
                comparePayload={comparePayload}
                onResolved={async () => {
                const statusRes = await fetch('/api/sync/status')
                setSyncStatus(await statusRes.json())
                await syncContext?.refresh()
              }} />
              </div>
            </div>
          </section>
        )}

        {/* Import */}
        {canImport && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              {t('sections.import')}
            </h2>
            <div className="card p-6 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">{t('import.title')}</h3>
                <p className="text-sm text-slate-500 mt-1">{t('import.description')}</p>
                <p className="text-xs font-medium text-emerald-600 mt-2">{t('import.formats')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('import.perClass')}</p>
              </div>
              <button
                onClick={() => router.push(`/${slug}/eleves/migration`)}
                className="btn-primary flex items-center gap-2 shrink-0"
              >
                {t('import.action')} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* Export */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-600" />
            {t('sections.export')}
          </h2>
          <p className="text-sm text-slate-500 mb-4">{t('export.description')}</p>

          {accessibleEntities.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">{t('export.empty')}</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {accessibleEntities.map(entity => {
                const Icon = ENTITY_ICONS[entity]
                return (
                  <div key={entity} className="card p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{t(`entities.${entity}.title`)}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{t(`entities.${entity}.description`)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(FORMAT_META) as ExportFormat[]).map(format => {
                        const Meta = FORMAT_META[format]
                        const key = `${entity}-${format}`
                        const busy = downloading === key
                        return (
                          <button
                            key={format}
                            onClick={() => handleExport(entity, format)}
                            disabled={!!downloading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:border-emerald-400 hover:text-emerald-700 hover:bg-emerald-50/50 transition-colors disabled:opacity-50"
                          >
                            <Meta.icon className="w-3.5 h-3.5" />
                            {busy ? t('export.downloading') : t(`export.formats.${format}`)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Documents */}
        <section>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            {t('sections.documents')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {hasModuleAccess(userRole, 'bulletins') && (
              <a href={`/${slug}/notes/bulletins`} className="card p-4 hover:border-emerald-300 transition-colors group">
                <p className="font-medium text-slate-800 group-hover:text-emerald-700">{t('documents.bulletins')}</p>
                <p className="text-xs text-slate-500 mt-1">{t('documents.bulletinsDesc')}</p>
              </a>
            )}
            {hasModuleAccess(userRole, 'paiements') && (
              <a href={`/${slug}/paiements`} className="card p-4 hover:border-emerald-300 transition-colors group">
                <p className="font-medium text-slate-800 group-hover:text-emerald-700">{t('documents.receipts')}</p>
                <p className="text-xs text-slate-500 mt-1">{t('documents.receiptsDesc')}</p>
              </a>
            )}
            {hasModuleAccess(userRole, 'classes') && (
              <a href={`/${slug}/classes`} className="card p-4 hover:border-emerald-300 transition-colors group">
                <p className="font-medium text-slate-800 group-hover:text-emerald-700">{t('documents.classLists')}</p>
                <p className="text-xs text-slate-500 mt-1">{t('documents.classListsDesc')}</p>
              </a>
            )}
          </div>
        </section>

        {/* Backup */}
        {hasModuleAccess(userRole, 'parametres') && (
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <DatabaseBackup className="w-5 h-5 text-emerald-600" />
              {t('sections.backup')}
            </h2>
            <div className="card p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">{t('backup.title')}</h3>
                <p className="text-sm text-slate-500 mt-1">{t('backup.description')}</p>
              </div>
              <a href={`/${slug}/parametres`} className="btn-secondary flex items-center gap-2 shrink-0">
                {t('backup.action')} <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </section>
        )}
      </div>
    </PageShell>
  )
}
