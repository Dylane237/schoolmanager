let vercelActiveSlug: string | null = null

export function setVercelActiveSlug(slug: string | null): void {
  vercelActiveSlug = slug
}

export function getVercelActiveSlug(): string | null {
  return vercelActiveSlug
}
