import 'server-only'
import { getSupabaseAdmin, isSupabaseConfigured } from './supabase-admin'

export type PlatformPresenceStats = {
  desktop_ever_used?: boolean
  desktop_first_seen_at?: string
  web_ever_used?: boolean
  web_first_seen_at?: string
}

export type PlatformPresence = {
  desktop_ever_used: boolean
  web_ever_used: boolean
}

async function readPlatformStats(ecoleSlug: string): Promise<PlatformPresenceStats> {
  if (!isSupabaseConfigured()) return {}

  const supabase = getSupabaseAdmin()!
  const { data } = await supabase
    .from('cloud_sync_meta')
    .select('dashboard_stats')
    .eq('ecole_slug', ecoleSlug)
    .maybeSingle()

  return (data?.dashboard_stats as PlatformPresenceStats | null) ?? {}
}

export async function hasDesktopEverUsed(ecoleSlug: string): Promise<boolean> {
  const stats = await readPlatformStats(ecoleSlug)
  return stats.desktop_ever_used === true
}

export async function hasWebEverUsed(ecoleSlug: string): Promise<boolean> {
  const stats = await readPlatformStats(ecoleSlug)
  return stats.web_ever_used === true
}

export async function fetchPlatformPresence(ecoleSlug: string): Promise<PlatformPresence> {
  const stats = await readPlatformStats(ecoleSlug)
  return {
    desktop_ever_used: stats.desktop_ever_used === true,
    web_ever_used: stats.web_ever_used === true,
  }
}

async function markPlatformEverUsed(ecoleSlug: string, platform: 'desktop' | 'web'): Promise<void> {
  if (!isSupabaseConfigured()) return

  const slug = ecoleSlug.trim()
  if (!slug) return

  const flagKey = platform === 'desktop' ? 'desktop_ever_used' : 'web_ever_used'
  const seenKey = platform === 'desktop' ? 'desktop_first_seen_at' : 'web_first_seen_at'

  const stats = await readPlatformStats(slug)
  if (stats[flagKey] === true) return

  const now = new Date().toISOString()
  const supabase = getSupabaseAdmin()!
  await supabase.from('cloud_sync_meta').upsert(
    {
      ecole_slug: slug,
      synced_at: now,
      dashboard_stats: {
        ...stats,
        [flagKey]: true,
        [seenKey]: now,
      },
    },
    { onConflict: 'ecole_slug' },
  )
}

export async function markDesktopEverUsed(ecoleSlug: string): Promise<void> {
  await markPlatformEverUsed(ecoleSlug, 'desktop')
}

export async function markWebEverUsed(ecoleSlug: string): Promise<void> {
  await markPlatformEverUsed(ecoleSlug, 'web')
}

export function readPlatformPresenceFromStats(stats: unknown): PlatformPresence {
  if (!stats || typeof stats !== 'object') {
    return { desktop_ever_used: false, web_ever_used: false }
  }
  const s = stats as PlatformPresenceStats
  return {
    desktop_ever_used: s.desktop_ever_used === true,
    web_ever_used: s.web_ever_used === true,
  }
}
