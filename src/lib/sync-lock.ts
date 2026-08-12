import 'server-only'

const activeSyncs = new Map<string, Promise<unknown>>()

/** Empêche deux sync DB simultanées pour la même école (AutoDbSync + manuel). */
export async function withSchoolSyncLock<T>(ecoleSlug: string, fn: () => Promise<T>): Promise<T> {
  const previous = activeSyncs.get(ecoleSlug) ?? Promise.resolve()
  const run = previous.catch(() => undefined).then(fn)
  activeSyncs.set(ecoleSlug, run)
  try {
    return await run
  } finally {
    if (activeSyncs.get(ecoleSlug) === run) {
      activeSyncs.delete(ecoleSlug)
    }
  }
}
