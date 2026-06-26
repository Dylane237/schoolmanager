'use client'

import { useEffect, useState } from 'react'

export function AuthStepContent({ stepKey, children }: { stepKey: number | string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [stepKey])

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
    >
      {children}
    </div>
  )
}
