export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Génère un slug unique en ajoutant un suffixe numérique si nécessaire. */
export function uniqueSlug(
  base: string,
  exists: (slug: string) => boolean,
): string {
  let slug = slugify(base) || 'ecole'
  if (!exists(slug)) return slug
  for (let i = 2; i < 1000; i++) {
    const candidate = `${slug}-${i}`
    if (!exists(candidate)) return candidate
  }
  return `${slug}-${Date.now()}`
}

