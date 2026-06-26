'use client'

import { Toaster } from 'react-hot-toast'

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#1e293b',
          color: '#f8fafc',
          fontSize: '15px',
          borderRadius: '12px',
          padding: '12px 16px',
        },
        success: { iconTheme: { primary: '#10b981', secondary: '#f8fafc' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#f8fafc' } },
      }}
    />
  )
}
