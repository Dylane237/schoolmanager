import { MarketingHero } from '@/components/marketing/MarketingHero'
import { MarketingPreviewSection } from '@/components/marketing/MarketingPreviewSection'
import { MarketingFeatureGrid } from '@/components/marketing/MarketingFeatureGrid'
import { MarketingProductStory } from '@/components/marketing/MarketingProductStory'
import { MarketingPricingSection } from '@/components/marketing/MarketingPricingSection'
import { MarketingFinalCta } from '@/components/marketing/MarketingFinalCta'

export default function LandingPage() {
  return (
    <>
      <MarketingHero />
      <MarketingPreviewSection />
      <MarketingFeatureGrid />
      <MarketingProductStory />
      <MarketingPricingSection />
      <MarketingFinalCta />
    </>
  )
}
