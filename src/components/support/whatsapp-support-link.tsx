import { getSupportWhatsAppUrl, SUPPORT_PHONE_DISPLAY } from '@/lib/support'
import { WhatsAppIcon } from './whatsapp-icon'

type WhatsAppSupportLinkProps = {
  message?: string
  label?: string
  hint?: string
  showHint?: boolean
  variant?: 'default' | 'dark'
  className?: string
}

export function WhatsAppSupportLink({
  message,
  label = `WhatsApp — ${SUPPORT_PHONE_DISPLAY}`,
  hint = "Besoin d'aide ?",
  showHint = false,
  variant = 'default',
  className = '',
}: WhatsAppSupportLinkProps) {
  const isDark = variant === 'dark'

  return (
    <div className={showHint ? 'border-t border-gray-100 pt-4' : ''}>
      {showHint && hint && (
        <p className={`mb-2.5 text-center text-[12px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          {hint}
        </p>
      )}
      <a
        href={getSupportWhatsAppUrl(message)}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex w-full items-center justify-center gap-2.5 rounded-xl border px-4 py-2.5 text-[13px] font-medium transition-colors ${
          isDark
            ? 'border-white/15 bg-white/5 text-white hover:border-[#25D366]/50 hover:bg-[#25D366]/10'
            : 'border-gray-200 bg-white text-gray-700 hover:border-[#25D366]/40 hover:bg-[#25D366]/5 hover:text-gray-900'
        } ${className}`}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm shadow-[#25D366]/30">
          <WhatsAppIcon size={14} className="text-white" />
        </span>
        <span className="leading-none">{label}</span>
      </a>
    </div>
  )
}
