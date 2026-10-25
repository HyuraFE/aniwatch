import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { readingProgress, type ReadingProgress } from '@/db/schema';

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

/**
 * Persists guest reading progress into Supabase upon user login,
 * then resolves conflicts with latest-wins policy.
 */
export async function mergeGuestProgress(
  userId: string,
  guestMap: GuestProgressMap
): Promise<void> {
  if (!userId || !guestMap || Object.keys(guestMap).length === 0) return;

  // 1. Fetch current user progress from Supabase
  const current = await db
    .select()
    .from(readingProgress)
    .where(eq(readingProgress.userId, userId));

  // 2. Reconcile
  const merged = reconcileProgress(current, guestMap);

  // 3. Batch upsert the differences
  for (const record of Object.values(merged)) {
    await db
      .insert(readingProgress)
      .values({
        userId,
        mangaId: record.mangaId,
        chapterId: record.chapterId,
        lastPage: record.lastPage,
        isCompleted: record.isCompleted || false,
        updatedAt: new Date(record.updatedAt),
      })
      .onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.chapterId],
        set: {
          lastPage: record.lastPage,
          isCompleted: record.isCompleted || false,
          updatedAt: new Date(record.updatedAt),
        },
      });
  }
}
