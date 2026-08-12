'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { FileDown, FileUp, Printer } from 'lucide-react'
import toast from 'react-hot-toast'

interface ClassListActionsProps {
  classeId: string
  classeNom: string
  onImported?: () => void
}

export default function ClassListActions({ classeId, classeNom, onImported }: ClassListActionsProps) {
  const t = useTranslations('components.classListActions')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async (print = false) => {
    const res = await fetch(`/api/classes/${classeId}/export?format=json`)
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || t('exportError'))
      return
    }

    if (print) {
      const win = window.open('', '_blank', 'width=900,height=700')
      if (!win) {
        toast.error(t('popupBlocked'))
        return
      }
      win.document.write(data.html)
      win.document.close()
      win.onload = () => win.print()
    }

    toast.success(
      t('exportSuccess', { count: data.count, filename: data.filename }),
      { duration: 5000 },
    )
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    const res = await fetch(`/api/classes/${classeId}/import`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || t('importError'))
      return
    }

    toast.success(t('importSuccess', {
      total: data.total,
      assigned: data.assigned,
      created: data.created,
    }))
    if (data.errors?.length) {
      data.errors.forEach((err: string) => toast.error(err, { duration: 4000 }))
    }
    onImported?.()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => handleExport(true)}
        className="btn-secondary flex items-center gap-2 py-2 text-sm"
      >
        <Printer className="w-4 h-4" /> {t('printPdf')}
      </button>
      <button
        type="button"
        onClick={() => handleExport(false)}
        className="btn-secondary flex items-center gap-2 py-2 text-sm"
      >
        <FileDown className="w-4 h-4" /> {t('export')}
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="btn-secondary flex items-center gap-2 py-2 text-sm"
      >
        <FileUp className="w-4 h-4" /> {t('importCsv')}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={handleImport}
      />
      <span className="text-xs text-slate-400 hidden sm:inline">
        {t('csvHint')}
      </span>
    </div>
  )
}
