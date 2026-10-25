export interface DedupableChapter {
  id: string;
  chapterNumber: string;
  publishedAt?: string | Date | null;
  pagesCount?: number;
  scanlationGroups?: string[];
  [key: string]: any;
}

/**
 * Parses a chapter label into a sortable number.
 * Returns null for non-numeric labels like "Extra", "Oneside", "Prologue".
 */
function parseChapterNumber(value: string): number | null {
  if (!value) return null;
  const match = value.match(/^\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = parseFloat(match[1]);
  return Number.isNaN(parsed) ? null : parsed;
}

function timestamp(value?: string | Date | null): number {
  if (!value) return 0;
  const t = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Deduplicates chapters that share a chapter number across different
 * scanlation groups, keeping the newest upload (ties broken by page count),
 * and sorts the result in descending chapter order.
 */
export function deduplicateChapters<T extends DedupableChapter>(
  chapters: T[]
): T[] {
  const winners = new Map<string, T>();

  for (const chapter of chapters) {
    const key = chapter.chapterNumber;
    const current = winners.get(key);

    if (!current) {
      winners.set(key, chapter);
      continue;
    }

    const currentTime = timestamp(current.publishedAt);
    const candidateTime = timestamp(chapter.publishedAt);

    if (candidateTime > currentTime) {
      winners.set(key, chapter);
    } else if (
      candidateTime === currentTime &&
      (chapter.pagesCount ?? 0) > (current.pagesCount ?? 0)
    ) {
      winners.set(key, chapter);
    }
  }

  return Array.from(winners.values()).sort((a, b) => {
    const aNum = parseChapterNumber(a.chapterNumber);
    const bNum = parseChapterNumber(b.chapterNumber);

    // Numeric chapters sort before non-numeric labels
    if (aNum !== null && bNum !== null) return bNum - aNum;
    if (aNum !== null) return -1;
    if (bNum !== null) return 1;

    // Non-numeric labels sort by publish date, newest first
    return timestamp(b.publishedAt) - timestamp(a.publishedAt);
  });
}
