import { LICENCE_SERVER_URL } from './licence-server'
import type { SchoolSyncPayload } from './sync-payload'

/** Push données école vers le serveur cloud (Vercel). Non bloquant si hors ligne. */
export async function pushSchoolDataToCloud(
  payload: SchoolSyncPayload,
): Promise<{ ok: boolean; error?: string; counts?: { eleves: number; classes: number } }> {
  const secret = process.env.LICENCE_SERVER_SECRET
  try {
    const res = await fetch(`${LICENCE_SERVER_URL}/api/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SchoolManager-Desktop/1.0',
        ...(secret ? { 'x-server-secret': secret } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error || 'Sync cloud échouée' }
    return { ok: true, counts: data.counts }
  } catch {
    return { ok: false, error: 'Serveur cloud inaccessible' }
  }
}
