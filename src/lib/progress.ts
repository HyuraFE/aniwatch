export interface ProgressEntry {
  chapterId: string;
  mangaId: string;
  lastPage: number;
  isCompleted?: boolean;
  updatedAt: string | Date;
}

export type GuestProgressMap = Record<string, ProgressEntry>;

function toEpochMs(d: string | Date): number {
  if (d instanceof Date) return d.getTime();
  const parsed = Date.parse(d);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Pure function: reconciles server progress records with guest localStorage records.
 * Rule: latest updatedAt wins. If identical, server record wins.
 *
 * Kept free of database imports so it can be bundled for the browser.
 */
export function reconcileProgress(
  serverRecords: Array<{
    chapterId: string;
    mangaId: string;
    lastPage: number;
    isCompleted?: boolean;
    updatedAt: Date | string;
  }>,
  guestRecords: GuestProgressMap = {}
): Record<string, ProgressEntry> {
  const map: Record<string, ProgressEntry> = {};

  // 1. Load server records
  for (const s of serverRecords) {
    map[s.chapterId] = {
      chapterId: s.chapterId,
      mangaId: s.mangaId,
      lastPage: s.lastPage,
      isCompleted: s.isCompleted,
      updatedAt: s.updatedAt,
    };
  }

  // 2. Merge guest records: guest wins only if strictly newer
  for (const [chapterId, g] of Object.entries(guestRecords || {})) {
    const existing = map[chapterId];
    if (!existing) {
      map[chapterId] = g;
      continue;
    }

    const serverMs = toEpochMs(existing.updatedAt);
    const guestMs = toEpochMs(g.updatedAt);

    if (guestMs > serverMs) {
      map[chapterId] = g;
    }
  }

  return map;
}
