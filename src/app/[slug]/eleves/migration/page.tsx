'use client'

import { useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  Upload, Download, ChevronRight, ChevronLeft, Check,
  AlertTriangle, FileSpreadsheet, Users,
} from 'lucide-react'
import PageShell from '@/components/layout/PageShell'
import Badge from '@/components/ui/Badge'
import { CSV_TEMPLATE } from '@/lib/csv-students'

interface PreviewRow {
  line: number
  matricule?: string
  nom?: string
  prenom?: string
  sexe?: string
  classe?: string
  section?: string
  status: 'create' | 'assign' | 'missing_class' | 'invalid' | 'duplicate'
  message?: string
  classeNom?: string
}

interface PreviewData {
  rows: PreviewRow[]
  missingClasses: string[]
  summary: {
    total: number
    create: number
    assign: number
    missing_class: number
    invalid: number
    duplicate: number
  }
}

interface ImportResult {
  assigned: number
  created: number
  classesCreated: number
  parentsAdded: number
  total: number
  errors?: string[]
}

const STATUS_VARIANT: Record<PreviewRow['status'], 'success' | 'info' | 'warning' | 'danger' | 'neutral'> = {
  create: 'success',
  assign: 'info',
  missing_class: 'warning',
  invalid: 'danger',
  duplicate: 'danger',
}

export default function MigrationPage() {
  const { slug } = useParams()
  const router = useRouter()
  const t = useTranslations('eleves.migration')
  const tc = useTranslations('common')

  const [step, setStep] = useState(1)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [createMissingClasses, setCreateMissingClasses] = useState(true)
  const [defaultSection, setDefaultSection] = useState('francophone')
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modele-import-eleves.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileSelect = (f: File | null) => {
    if (!f) return
    setFile(f)
    setError('')
    setPreview(null)
    setResult(null)
  }

  const runPreview = async () => {
    if (!file) return
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('defaultSection', defaultSection)

    try {
      const res = await fetch('/api/eleves/import/preview', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('errors.previewFailed'))
        return
      }
      setPreview(data)
      setStep(2)
    } catch {
      setError(t('errors.previewFailed'))
    } finally {
      setLoading(false)
    }
  }

  const runImport = async () => {
    if (!file) return
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('createMissingClasses', String(createMissingClasses))
    formData.append('defaultSection', defaultSection)

    try {
      const res = await fetch('/api/eleves/import', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || t('errors.importFailed'))
        return
      }
      setResult(data)
      setStep(3)
    } catch {
      setError(t('errors.importFailed'))
    } finally {
      setLoading(false)
    }
  }

  const canImport = preview && (
    preview.summary.invalid === 0 &&
    preview.summary.duplicate === 0 &&
    (preview.summary.missing_class === 0 || createMissingClasses)
  )

  const steps = [
    { num: 1, label: t('steps.upload') },
    { num: 2, label: t('steps.preview') },
    { num: 3, label: t('steps.done') },
  ]

  return (
    <PageShell
      title={t('title')}
      subtitle={t('subtitle')}
      breadcrumb={t('breadcrumb')}
      actions={
        <button
          onClick={() => router.push(`/${slug}/eleves`)}
          className="btn-secondary text-sm"
        >
          {t('backToList')}
        </button>
      }
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              step === s.num
                ? 'bg-emerald-600 text-white'
                : step > s.num
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-400'
            }`}>
              {step > s.num ? <Check className="w-4 h-4" /> : <span>{s.num}</span>}
              <span>{s.label}</span>
            </div>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-300" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="max-w-2xl">
          <div className="card p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800">{t('upload.title')}</h2>
                <p className="text-slate-500 text-sm mt-1">{t('upload.description')}</p>
              </div>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
              onDrop={e => {
                e.preventDefault()
                const f = e.dataTransfer.files[0]
                if (f) handleFileSelect(f)
              }}
              className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors"
            >
              <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              {file ? (
                <p className="font-medium text-emerald-700">{file.name}</p>
              ) : (
                <>
                  <p className="font-medium text-slate-600">{t('upload.dropzone')}</p>
                  <p className="text-sm text-slate-400 mt-1">{t('upload.formats')}</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls,.json"
                className="hidden"
                onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={downloadTemplate} className="btn-secondary text-sm flex items-center gap-2">
                <Download className="w-4 h-4" /> {t('upload.downloadTemplate')}
              </button>
            </div>

            <div className="mt-6 p-4 bg-slate-50 rounded-xl">
              <p className="text-sm font-medium text-slate-700 mb-2">{t('upload.columnsTitle')}</p>
              <p className="text-xs text-slate-500 font-mono leading-relaxed">
                matricule · nom · prenom · sexe · classe · section · date_naissance · parent_nom · parent_telephone
              </p>
              <p className="text-xs text-slate-400 mt-2">{t('upload.columnsHint')}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={runPreview}
              disabled={!file || loading}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? tc('loading') : t('upload.analyze')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && preview && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              { label: t('summary.total'), value: preview.summary.total, color: 'text-slate-700' },
              { label: t('summary.create'), value: preview.summary.create, color: 'text-emerald-600' },
              { label: t('summary.assign'), value: preview.summary.assign, color: 'text-blue-600' },
              { label: t('summary.missingClass'), value: preview.summary.missing_class, color: 'text-amber-600' },
              { label: t('summary.invalid'), value: preview.summary.invalid, color: 'text-red-600' },
              { label: t('summary.duplicate'), value: preview.summary.duplicate, color: 'text-red-600' },
            ].map(item => (
              <div key={item.label} className="card p-4 text-center">
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                <p className="text-xs text-slate-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Options */}
          {preview.summary.missing_class > 0 && (
            <div className="card p-5 mb-6 border-amber-200 bg-amber-50/50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-800">{t('options.missingClassesTitle')}</p>
                  <p className="text-sm text-amber-700 mt-1">
                    {preview.missingClasses.join(', ')}
                  </p>
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createMissingClasses}
                      onChange={e => setCreateMissingClasses(e.target.checked)}
                      className="rounded border-amber-400"
                    />
                    <span className="text-sm text-amber-800">{t('options.createMissingClasses')}</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="card p-5 mb-6">
            <label className="text-sm font-medium text-slate-700">{t('options.defaultSection')}</label>
            <select
              value={defaultSection}
              onChange={e => setDefaultSection(e.target.value)}
              className="mt-2 w-full max-w-xs border border-slate-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="francophone">{t('options.sectionFrancophone')}</option>
              <option value="anglophone">{t('options.sectionAnglophone')}</option>
              <option value="maternelle">{t('options.sectionMaternelle')}</option>
            </select>
          </div>

          {/* Preview table */}
          <div className="card overflow-hidden mb-6">
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">{t('table.status')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">{t('table.name')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">{t('table.matricule')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">{t('table.class')}</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500">{t('table.note')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map(row => (
                    <tr key={row.line} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-400">{row.line}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant={STATUS_VARIANT[row.status]}>
                          {t(`status.${row.status}`)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {row.nom} {row.prenom}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-slate-500">{row.matricule || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{row.classeNom || row.classe || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">{row.message || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="btn-secondary flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" /> {t('back')}
            </button>
            <button
              onClick={runImport}
              disabled={!canImport || loading}
              className="btn-primary flex items-center gap-2"
              title={!canImport ? t('errors.cannotImport') : undefined}
            >
              <Users className="w-4 h-4" />
              {loading ? tc('loading') : t('import')}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && result && (
        <div className="max-w-lg mx-auto text-center">
          <div className="card p-10">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{t('done.title')}</h2>
            <p className="text-slate-500 mt-2">{t('done.subtitle', { total: result.total })}</p>

            <div className="grid grid-cols-2 gap-4 mt-8 text-left">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600">{result.created}</p>
                <p className="text-sm text-slate-500">{t('done.created')}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">{result.assigned}</p>
                <p className="text-sm text-slate-500">{t('done.assigned')}</p>
              </div>
              {result.classesCreated > 0 && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-bold text-amber-600">{result.classesCreated}</p>
                  <p className="text-sm text-slate-500">{t('done.classesCreated')}</p>
                </div>
              )}
              {result.parentsAdded > 0 && (
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-2xl font-bold text-slate-600">{result.parentsAdded}</p>
                  <p className="text-sm text-slate-500">{t('done.parentsAdded')}</p>
                </div>
              )}
            </div>

            {result.errors && result.errors.length > 0 && (
              <div className="mt-6 p-4 bg-amber-50 rounded-xl text-left">
                <p className="text-sm font-medium text-amber-800 mb-2">{t('done.warnings')}</p>
                <ul className="text-xs text-amber-700 space-y-1">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            <button
              onClick={() => router.push(`/${slug}/eleves`)}
              className="btn-primary mt-8 w-full"
            >
              {t('done.viewStudents')}
            </button>
          </div>
        </div>
      )}
    </PageShell>
  )
}
