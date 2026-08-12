import Image from 'next/image'

type MarketingScreenshotProps = {
  src: string
  alt: string
  priority?: boolean
}

export function MarketingScreenshot({ src, alt, priority = false }: MarketingScreenshotProps) {
  return (
    <div className="mk-screenshot-wrap">
      <Image
        src={src}
        alt={alt}
        width={1400}
        height={900}
        priority={priority}
        className="mk-screenshot-img"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 640px"
      />
    </div>
  )
}
