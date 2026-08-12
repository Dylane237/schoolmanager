'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Camera, Loader2, User } from 'lucide-react'

interface PhotoUploadProps {
  photoUrl?: string | null
  eleveId?: string
  onUploaded?: (url: string) => void
  onSelected?: (file: File, previewUrl: string) => void
  compact?: boolean
}

export default function PhotoUpload({
  photoUrl,
  eleveId,
  onUploaded,
  onSelected,
  compact = false,
}: PhotoUploadProps) {
  const t = useTranslations('components.photoUpload')
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(photoUrl || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    setError('')
    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)

    if (onSelected) {
      onSelected(file, previewUrl)
      return
    }

    if (!eleveId) return

    setLoading(true)
    const formData = new FormData()
    formData.append('photo', file)
    formData.append('eleve_id', eleveId)

    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || t('uploadError'))
      setLoading(false)
      return
    }

    setPreview(data.photo_url)
    onUploaded?.(data.photo_url)
    setLoading(false)
  }

  const size = compact ? 'w-16 h-16' : 'w-28 h-28'

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`${size} rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 hover:border-emerald-400 overflow-hidden flex items-center justify-center transition-colors relative group`}
      >
        {preview ? (
          <img src={preview} alt="" className="w-full h-full object-cover" />
        ) : (
          <User className="w-8 h-8 text-slate-300" />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          {loading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white" />
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      {!compact && (
        <p className="text-sm text-slate-500">{t('hint')}</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
