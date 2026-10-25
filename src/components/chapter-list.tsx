'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Chapter } from '@/db/schema';

interface ChapterListProps {
  mangaId: string;
  language: string;
  initialChapters: Chapter[];
  initialTotal: number;
}

function formatDate(date: Date | null): string {
  if (!date) return 'Undated';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function ChapterList({
  mangaId,
  language,
  initialChapters,
  initialTotal,
}: ChapterListProps) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(initialChapters.length);
  const [loading, setLoading] = useState(false);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [ascending, setAscending] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = chapters.length < total;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/chapters/feed?mangaId=${mangaId}&lang=${language}&offset=${offset}&showAll=${showAllGroups}`
      );
      if (!res.ok) throw new Error('feed failed');
      const data = await res.json();
      setChapters((prev) => [...prev, ...data.chapters]);
      setTotal(data.total);
      setOffset((prev) => prev + 100);
    } catch {
      // Leave state unchanged; the sentinel will retry on the next intersection.
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, mangaId, language, offset, showAllGroups]);

  // Infinite scroll trigger
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const sorted = ascending ? [...chapters].reverse() : chapters;

  return (
    <section>
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 border-b-2 border-ink pb-3">
        <div>
          <h2 className="font-display font-black text-xl uppercase tracking-wider text-ink">
            TABLE OF CONTENTS{' '}
            <span className="font-editorial italic font-normal text-muted text-base">
              ({language.toUpperCase()})
            </span>
          </h2>
          <p className="font-meta text-[11px] text-muted mt-1">
            {showAllGroups
              ? 'Showing every scanlation group upload'
              : 'Deduplicated — newest release per chapter number'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="font-meta text-xs text-muted flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAllGroups}
              onChange={(e) => setShowAllGroups(e.target.checked)}
              className="w-3.5 h-3.5 rounded-none border-hairline bg-zinc-950 accent-vermilion"
            />
            All groups
          </label>
          <button
            onClick={() => setAscending((v) => !v)}
            className="px-3 py-1.5 border border-hairline font-meta text-xs text-zinc-300 hover:border-vermilion hover:text-vermilion transition"
          >
            {ascending ? 'Order: Oldest First ↑' : 'Order: Newest First ↓'}
          </button>
        </div>
      </div>

      {/* Chapter Rows — printed TOC style */}
      <div className="border border-hairline divide-y divide-hairline">
        {sorted.map((chapter) => {
          const isExternal = Boolean(chapter.externalUrl);
          const disabled = chapter.isUnavailable;

          const rowContent = (
            <>
              <div className="flex items-center gap-4">
                <span className="font-meta font-bold text-base w-16 shrink-0 text-vermilion">
                  #{chapter.chapterNumber}
                </span>
                <div>
                  <div
                    className={`font-editorial text-base font-semibold ${
                      disabled ? 'text-muted line-through' : 'text-ink'
                    }`}
                  >
                    {chapter.title || `Chapter ${chapter.chapterNumber}`}
                    {disabled && (
                      <span className="font-meta text-[10px] bg-zinc-800 text-muted px-1.5 py-0.5 ml-2">
                        UNAVAILABLE
                      </span>
                    )}
                  </div>
                  <div className="font-meta text-[11px] text-muted mt-0.5">
                    {chapter.scanlationGroups.length > 0
                      ? chapter.scanlationGroups.join(', ')
                      : 'Unknown group'}{' '}
                    • {formatDate(chapter.publishedAt)}
                    {chapter.pagesCount > 0 && ` • ${chapter.pagesCount} pages`}
                  </div>
                </div>
              </div>

              {isExternal ? (
                <span className="px-3 py-1.5 border border-vermilion text-vermilion hover:bg-vermilion hover:text-white transition font-meta font-bold text-[11px] uppercase shrink-0">
                  Read on MangaPlus ↗
                </span>
              ) : (
                <span className="px-4 py-1.5 bg-zinc-800 text-zinc-200 font-meta font-bold text-[11px] uppercase shrink-0 group-hover:bg-vermilion group-hover:text-white transition">
                  Read →
                </span>
              )}
            </>
          );

          const rowClass = `flex items-center justify-between gap-4 p-3.5 ${
            disabled ? 'opacity-50' : ''
          }`;

          if (disabled) {
            return (
              <div key={chapter.id} className={rowClass}>
                {rowContent}
              </div>
            );
          }

          if (isExternal) {
            return (
              <a
                key={chapter.id}
                href={chapter.externalUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className={`${rowClass} hover:bg-zinc-900 transition`}
              >
                {rowContent}
              </a>
            );
          }

          return (
            <Link
              key={chapter.id}
              href={`/manga/${mangaId}/read/${chapter.id}`}
              className={`${rowClass} hover:bg-zinc-900 transition group`}
            >
              {rowContent}
            </Link>
          );
        })}

        {sorted.length === 0 && (
          <div className="p-10 text-center">
            <p className="font-meta text-sm text-muted">
              No chapters available in this language.
            </p>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="p-4 text-center">
          {loading && (
            <span className="font-meta text-xs text-muted">LOADING…</span>
          )}
          {!loading && !hasMore && sorted.length > 0 && (
            <span className="font-meta text-xs text-muted">
              — END OF INDEX —
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
