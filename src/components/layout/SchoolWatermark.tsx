'use client'

import { useSchool } from './SchoolProvider'

/** Filigranes discrets en bordure — plusieurs petits logos, pas au centre du contenu. */
export default function SchoolWatermark() {
  const { logoUrl } = useSchool()

  if (!logoUrl) return null

  const positions = [
    'top-[6%] left-[4%]',
    'top-[6%] right-[4%]',
    'top-[28%] left-[2%]',
    'top-[28%] right-[2%]',
    'bottom-[28%] left-[3%]',
    'bottom-[28%] right-[3%]',
    'bottom-[6%] left-[5%]',
    'bottom-[6%] right-[5%]',
  ] as const

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden print:hidden"
      aria-hidden
    >
      {positions.map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 opacity-[0.085]`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            className="h-full w-full object-contain select-none"
            draggable={false}
          />
        </div>
      ))}
    </div>
  )
}
