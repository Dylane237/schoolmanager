'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { User, ExternalLink } from 'lucide-react'
import type { StudentContext } from '@/lib/student-context-links'

interface Props {
  slug: string
  student: StudentContext
  className?: string
}

export default function StudentContextBanner({ slug, student, className = '' }: Props) {
  const t = useTranslations('components.studentContextBanner')

  return (
    <div className={`flex flex-wrap items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm ${className}`}>
      <User className="w-4 h-4 text-emerald-600 shrink-0" />
      <span className="text-slate-600">
        {t('context')}
        <strong className="text-slate-800 ml-1">{student.prenom} {student.nom}</strong>
        {student.numero_matricule && (
          <span className="text-slate-400 ml-2 font-mono text-xs">{student.numero_matricule}</span>
        )}
      </span>
      <Link
        href={`/${slug}/eleves/${student.id}`}
        className="ml-auto inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold"
      >
        {t('viewProfile')} <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  )
}
