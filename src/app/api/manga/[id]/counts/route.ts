import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { manga } from '@/db/schema';
import { getLanguageChapterCount } from '@/lib/mangadex/api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let availableLanguages: string[] = [];
  let cachedCounts: Record<string, number> = {};

  try {
    const row = await db
      .select()
      .from(manga)
      .where(eq(manga.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (row) {
      availableLanguages = row.availableLanguages;
      cachedCounts = row.chapterCounts || {};
    }
  } catch {
    // DB unavailable — fall back to an uncached response
  }

  // Only fetch counts that are not already cached
  const missing = availableLanguages.filter(
    (code) => typeof cachedCounts[code] !== 'number'
  );

  const fetched: Record<string, number> = {};

  // Fetch in small batches so one slow language never blocks the others
  for (const code of missing.slice(0, 8)) {
    try {
      fetched[code] = await getLanguageChapterCount(id, code);
    } catch {
      // Skip languages that fail; the pill simply shows no count
    }
  }

  const merged = { ...cachedCounts, ...fetched };

  // Persist the new counts for next time
  if (Object.keys(fetched).length > 0) {
    try {
      await db
        .update(manga)
        .set({ chapterCounts: merged, updatedAt: new Date() })
        .where(eq(manga.id, id));
    } catch {
      // Non-fatal
    }
  }

  return NextResponse.json({
    counts: merged,
    availableLanguages,
    pending: missing.length - Object.keys(fetched).length,
  });
}
