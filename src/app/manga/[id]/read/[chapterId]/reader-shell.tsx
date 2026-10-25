'use client';

import { useState } from 'react';
import { ReaderControls } from '@/components/reader/reader-controls';
import { WebtoonReader } from '@/components/reader/webtoon-reader';
import { PagedReader } from '@/components/reader/paged-reader';
import { ProgressTracker } from '@/components/reader/progress-tracker';
import type { ReaderQuality } from '@/lib/mangadex/reader';

interface ReaderShellProps {
  mangaId: string;
  mangaTitle: string;
  chapterId: string;
  chapterNumber: string;
  baseUrl: string;
  hash: string;
  fullPages: string[];
  saverPages: string[];
  initialDirection: 'rtl' | 'ltr';
}

export function ReaderShell({
  mangaId,
  mangaTitle,
  chapterId,
  chapterNumber,
  baseUrl,
  hash,
  fullPages,
  saverPages,
  initialDirection,
}: ReaderShellProps) {
  const [mode, setMode] = useState<'webtoon' | 'paged'>('webtoon');
  const [quality, setQuality] = useState<ReaderQuality>('full');
  const [direction, setDirection] = useState<'rtl' | 'ltr'>(initialDirection);
  const [currentPage, setCurrentPage] = useState(1);

  const activePages = quality === 'saver' ? saverPages : fullPages;
  const totalPages = activePages.length;

  return (
    <div className="min-h-screen bg-black text-ink flex flex-col">
      <ReaderControls
        mangaId={mangaId}
        mangaTitle={mangaTitle}
        chapterNumber={chapterNumber}
        currentPage={currentPage}
        totalPages={totalPages}
        mode={mode}
        quality={quality}
        direction={direction}
        onModeChange={setMode}
        onQualityChange={setQuality}
        onDirectionChange={setDirection}
        onPageSelect={setCurrentPage}
      />

      <main className="flex-1">
        {mode === 'webtoon' ? (
          <WebtoonReader
            baseUrl={baseUrl}
            hash={hash}
            pages={activePages}
            quality={quality}
            onPageVisible={(idx) => setCurrentPage(idx + 1)}
          />
        ) : (
          <PagedReader
            baseUrl={baseUrl}
            hash={hash}
            pages={activePages}
            quality={quality}
            direction={direction}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}
      </main>

      {/* LocalStorage + DB Progress Tracker */}
      <ProgressTracker
        mangaId={mangaId}
        chapterId={chapterId}
        pageIndex={currentPage - 1}
        totalPages={totalPages}
        isSignedIn={false}
      />
    </div>
  );
}
