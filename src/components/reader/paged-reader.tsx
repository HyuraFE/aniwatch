'use client';

import { useCallback, useEffect } from 'react';
import { buildPageUrl, type ReaderQuality } from '@/lib/mangadex/reader';

interface PagedReaderProps {
  baseUrl: string;
  hash: string;
  pages: string[];
  quality: ReaderQuality;
  direction: 'rtl' | 'ltr';
  currentPage: number; // 1-indexed
  onPageChange: (page: number) => void;
}

export function PagedReader({
  baseUrl,
  hash,
  pages,
  quality,
  direction,
  currentPage,
  onPageChange,
}: PagedReaderProps) {
  const total = pages.length;
  const currentFilename = pages[currentPage - 1];

  const goNext = useCallback(() => {
    if (currentPage < total) onPageChange(currentPage + 1);
  }, [currentPage, total, onPageChange]);

  const goPrev = useCallback(() => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  }, [currentPage, onPageChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        direction === 'rtl' ? goPrev() : goNext();
      } else if (e.key === 'ArrowLeft') {
        direction === 'rtl' ? goNext() : goPrev();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        goNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, goNext, goPrev]);

  // Preload upcoming 2 pages
  useEffect(() => {
    const next1 = pages[currentPage];
    const next2 = pages[currentPage + 1];
    if (next1) {
      const img = new Image();
      img.src = buildPageUrl(baseUrl, hash, next1, quality);
    }
    if (next2) {
      const img = new Image();
      img.src = buildPageUrl(baseUrl, hash, next2, quality);
    }
  }, [currentPage, pages, baseUrl, hash, quality]);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;

    if (ratio < 0.35) {
      // Left side tapped
      direction === 'rtl' ? goNext() : goPrev();
    } else if (ratio > 0.65) {
      // Right side tapped
      direction === 'rtl' ? goPrev() : goNext();
    }
  };

  const currentUrl = currentFilename
    ? buildPageUrl(baseUrl, hash, currentFilename, quality)
    : '';

  return (
    <div
      onClick={handleTap}
      className="max-w-4xl mx-auto py-6 px-4 select-none cursor-pointer flex flex-col items-center justify-center min-h-[calc(100vh-120px)]"
    >
      <div className="relative border-2 border-hairline bg-black p-2 shadow-2xl flex items-center justify-center">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={`Page ${currentPage}`}
            className="max-h-[85vh] w-auto max-w-full object-contain block"
          />
        ) : (
          <div className="w-96 h-96 flex items-center justify-center text-muted font-meta text-xs">
            NO IMAGE
          </div>
        )}

        {/* Tap guide indicators */}
        <div className="absolute left-1 top-1 bottom-1 w-12 flex items-center justify-center text-zinc-700 font-meta text-[10px] pointer-events-none opacity-40">
          {direction === 'rtl' ? 'NEXT' : 'PREV'}
        </div>
        <div className="absolute right-1 top-1 bottom-1 w-12 flex items-center justify-center text-zinc-700 font-meta text-[10px] pointer-events-none opacity-40">
          {direction === 'rtl' ? 'PREV' : 'NEXT'}
        </div>
      </div>
    </div>
  );
}
