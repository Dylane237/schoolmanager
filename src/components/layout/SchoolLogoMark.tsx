'use client'

import { GraduationCap } from 'lucide-react'
import { useSchool } from './SchoolProvider'

const SIZES = {
  sm: { box: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { box: 'w-10 h-10', icon: 'w-5 h-5' },
  lg: { box: 'w-14 h-14', icon: 'w-7 h-7' },
  xl: { box: 'w-16 h-16', icon: 'w-8 h-8' },
} as const

type SchoolLogoMarkProps = {
  size?: keyof typeof SIZES
  className?: string
}

/** Logo établissement avec repli sur l’icône SchoolManager */
export default function SchoolLogoMark({ size = 'md', className = '' }: SchoolLogoMarkProps) {
  const { logoUrl, ecoleNom } = useSchool()
  const s = SIZES[size]

  if (logoUrl) {
    return (
      <div
        className={`${s.box} rounded-xl overflow-hidden shrink-0 shadow-lg ring-1 ring-white/10 bg-white flex items-center justify-center ${className}`}
      >
        <img
          src={logoUrl}
          alt={ecoleNom}
          className="w-full h-full object-contain p-1"
        />
      </div>
    )
  }

  return (
    <div
      className={`${s.box} bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25 ${className}`}
    >
      <GraduationCap className={`${s.icon} text-white`} strokeWidth={1.75} />
    </div>
  )
}
