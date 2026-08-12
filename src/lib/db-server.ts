export {
  getDb,
  getDbForSlug,
  closeDbForSlug,
  resetDesktopDbSingleton,
  getActiveAnneeScolaire,
  setTestDb,
  createMemoryDb,
} from './db'

export {
  prepareSchoolDb,
  markSchoolDbDirty,
  scheduleSchoolDbFlush,
  flushSchoolDb,
  resolveEcoleId,
  pullSchoolDbToLocal,
  pushSchoolDbFromLocal,
} from './school-db'

/** Prépare la base école et retourne db + ecoleId résolus. */
export async function getSchoolDb(
  ecoleSlug: string,
  ecoleId?: string | null,
) {
  const { prepareSchoolDb, resolveEcoleId } = await import('./school-db')
  const { getDb } = await import('./db')
  await prepareSchoolDb(ecoleSlug)
  const db = getDb(ecoleSlug)
  const resolvedId = resolveEcoleId(db, ecoleSlug, ecoleId ?? null)
  return { db, ecoleId: resolvedId }
}
