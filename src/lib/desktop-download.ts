/**
 * Hébergement gratuit du installateur Windows :
 * - GitHub Releases (repo public) : pas de domaine payant
 * - Override via NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL si besoin
 *
 * Après `electron:build`, publier manuellement :
 * GitHub → Releases → New release → tag v1.0.0 → joindre dist/SchoolManager-Setup.exe
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0'

export const GITHUB_REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'Dylane237/schoolmanager'

/** Nom fixe de l'asset (voir artifactName dans package.json → build.win). */
export const DESKTOP_INSTALLER_FILENAME = 'SchoolManager-Setup.exe'

/** URL directe du installateur NSIS Windows. */
export function getDesktopDownloadUrl(): string {
  if (process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL) {
    return process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL
  }
  return `https://github.com/${GITHUB_REPO}/releases/latest/download/${DESKTOP_INSTALLER_FILENAME}`
}

export function getGitHubReleasesPageUrl(): string {
  return `https://github.com/${GITHUB_REPO}/releases`
}

export function isElectronClient(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.getAppVersion)
}
