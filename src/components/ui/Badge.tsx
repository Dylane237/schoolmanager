interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size?: 'sm' | 'md'
}

const VARIANTS = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-slate-100 text-slate-600',
}

export default function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${VARIANTS[variant]} ${size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1'}`}>
      {children}
    </span>
  )
}
