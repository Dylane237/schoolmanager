import { MarketingHero } from '@/components/marketing/MarketingHero'
import { MarketingFeatureGrid } from '@/components/marketing/MarketingFeatureGrid'
import { MarketingDualChannel } from '@/components/marketing/MarketingDualChannel'
import { MarketingShowcase } from '@/components/marketing/MarketingShowcase'
import { MarketingHowItWorks } from '@/components/marketing/MarketingHowItWorks'
import { MarketingTestimonials } from '@/components/marketing/MarketingTestimonials'
import { MarketingPricingSection } from '@/components/marketing/MarketingPricingSection'
import { MarketingFaq } from '@/components/marketing/MarketingFaq'
import { MarketingFinalCta } from '@/components/marketing/MarketingFinalCta'

export default function LandingPage() {
  return (
    <>
      <MarketingHero />
      <MarketingFeatureGrid />
      <MarketingDualChannel />
      <MarketingShowcase />
      <MarketingHowItWorks />
      <MarketingTestimonials />
      <MarketingPricingSection />
      <MarketingFaq />
      <MarketingFinalCta />
    </>
  )
}
