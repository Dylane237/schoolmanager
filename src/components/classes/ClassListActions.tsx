'use client'

import { useRef } from 'react'
import { FileDown, FileUp, Printer } from 'lucide-react'
import toast from 'react-hot-toast'

interface ClassListActionsProps {
  classeId: string
  classeNom: string
  onImported?: () => void
}

export default function ClassListActions({ classeId, classeNom, onImported }: ClassListActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async (print = false) => {
    const res = await fetch(`/api/classes/${classeId}/export?format=json`)
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Erreur export')
      return
    }

    if (print) {
      const win = window.open('', '_blank', 'width=900,height=700')
      if (!win) {
        toast.error('Autorisez les pop-ups pour imprimer')
        return
      }
      win.document.write(data.html)
      win.document.close()
      win.onload = () => win.print()
    }

    toast.success(
      `Liste exportée (${data.count} élève(s)) → Documents/SchoolManager/exports/${data.filename}`,
      { duration: 5000 }
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
      toast.error(data.error || 'Erreur import')
      return
    }

    toast.success(`${data.total} élève(s) traité(s) (${data.assigned} affecté(s), ${data.created} créé(s))`)
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
        <Printer className="w-4 h-4" /> Imprimer / PDF
      </button>
      <button
        type="button"
        onClick={() => handleExport(false)}
        className="btn-secondary flex items-center gap-2 py-2 text-sm"
      >
        <FileDown className="w-4 h-4" /> Exporter liste
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="btn-secondary flex items-center gap-2 py-2 text-sm"
      >
        <FileUp className="w-4 h-4" /> Importer CSV
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={handleImport}
      />
      <span className="text-xs text-slate-400 hidden sm:inline">
        CSV : matricule,nom,prenom,sexe
      </span>
    </div>
  )
}
