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
        width={2048}
        height={1148}
        priority={priority}
        unoptimized
        className="mk-screenshot-img"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1152px"
      />
    </div>
  )
}
