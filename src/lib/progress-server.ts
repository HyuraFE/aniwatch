import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { readingProgress } from '@/db/schema';
import { reconcileProgress, type GuestProgressMap } from './progress';

/**
 * Persists guest reading progress into Supabase upon user login,
 * then resolves conflicts with the latest-wins policy.
 *
 * Server-only: imports the database client, so it must never reach the browser bundle.
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

  // 3. Upsert the reconciled records
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
