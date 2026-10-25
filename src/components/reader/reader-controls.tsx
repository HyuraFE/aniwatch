'use client';

import Link from 'next/link';
import type { ReaderQuality } from '@/lib/mangadex/reader';

interface ReaderControlsProps {
  mangaId: string;
  mangaTitle: string;
  chapterNumber: string;
  currentPage: number;
  totalPages: number;
  mode: 'webtoon' | 'paged';
  quality: ReaderQuality;
  direction: 'rtl' | 'ltr';
  onModeChange: (mode: 'webtoon' | 'paged') => void;
  onQualityChange: (quality: ReaderQuality) => void;
  onDirectionChange: (dir: 'rtl' | 'ltr') => void;
  onPageSelect: (page: number) => void;
}

export function ReaderControls({
  mangaId,
  mangaTitle,
  chapterNumber,
  currentPage,
  totalPages,
  mode,
  quality,
  direction,
  onModeChange,
  onQualityChange,
  onDirectionChange,
  onPageSelect,
}: ReaderControlsProps) {
  return (
    <>
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-paper/95 border-b border-hairline px-4 py-2 flex items-center justify-between font-meta text-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/manga/${mangaId}`}
            className="text-muted hover:text-ink font-bold uppercase transition"
          >
            ← {mangaTitle}
          </Link>
          <span className="text-zinc-600">|</span>
          <span className="font-editorial italic text-ink font-semibold">
            Chapter {chapterNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quality Toggle */}
          <button
            onClick={() => onQualityChange(quality === 'full' ? 'saver' : 'full')}
            className="px-2.5 py-1 border border-hairline text-zinc-300 hover:border-vermilion hover:text-vermilion transition"
          >
            {quality === 'full' ? 'HQ (/data/)' : 'Saver (/saver/)'}
          </button>

          {/* Mode Toggle */}
          <div className="flex border border-hairline divide-x divide-hairline">
            <button
              onClick={() => onModeChange('webtoon')}
              className={`px-3 py-1 font-bold ${
                mode === 'webtoon'
                  ? 'bg-vermilion text-white'
                  : 'text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              Webtoon
            </button>
            <button
              onClick={() => onModeChange('paged')}
              className={`px-3 py-1 font-bold ${
                mode === 'paged'
                  ? 'bg-vermilion text-white'
                  : 'text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              Paged
            </button>
          </div>
        </div>
      </header>

      {/* Bottom Pager Bar (Paged Mode) */}
      {mode === 'paged' && (
        <footer className="fixed bottom-0 left-0 right-0 z-30 bg-paper/95 border-t border-hairline px-4 py-2 flex items-center justify-between font-meta text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                onDirectionChange(direction === 'rtl' ? 'ltr' : 'rtl')
              }
              className="text-muted hover:text-ink uppercase"
            >
              Direction: <span className="text-vermilion font-bold">{direction.toUpperCase()}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span>PAGE</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (val >= 1 && val <= totalPages) onPageSelect(val);
              }}
              className="w-12 bg-black border border-hairline text-center text-ink py-1 font-meta text-xs"
            />
            <span>OF {totalPages}</span>
          </div>

          <div className="text-muted">
            Tap sides or use arrow keys
          </div>
        </footer>
      )}
    </>
  );
}
