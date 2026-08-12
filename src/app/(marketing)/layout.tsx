import { MarketingHeader } from '@/components/marketing/MarketingHeader'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'
import type { Metadata } from 'next'
import './marketing.css'

export const metadata: Metadata = {
  title: 'SchoolManager — Gestion scolaire au Cameroun',
  description:
    'Inscriptions, paiements par tranches, bulletins et reçus. Offline au bureau, accessible sur web et mobile.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-shell flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  )
}
