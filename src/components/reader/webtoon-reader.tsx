'use client';

import { useEffect, useRef } from 'react';
import { buildPageUrl, type ReaderQuality } from '@/lib/mangadex/reader';

interface WebtoonReaderProps {
  baseUrl: string;
  hash: string;
  pages: string[];
  quality: ReaderQuality;
  onPageVisible: (pageIndex: number) => void;
}

export function WebtoonReader({
  baseUrl,
  hash,
  pages,
  quality,
  onPageVisible,
}: WebtoonReaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Preload upcoming images
  useEffect(() => {
    pages.slice(0, 4).forEach((filename) => {
      const img = new Image();
      img.src = buildPageUrl(baseUrl, hash, filename, quality);
    });
  }, [baseUrl, hash, pages, quality]);

  // Track currently visible page
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll<HTMLElement>('[data-page-index]');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = parseInt(
              entry.target.getAttribute('data-page-index') || '0',
              10
            );
            onPageVisible(idx);
          }
        }
      },
      { threshold: 0.3 }
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [pages, onPageVisible]);

  return (
    <div
      ref={containerRef}
      className="max-w-[850px] mx-auto px-2 py-4 space-y-0"
    >
      {pages.map((filename, index) => {
        const url = buildPageUrl(baseUrl, hash, filename, quality);

        return (
          <div
            key={filename}
            data-page-index={index}
            className="relative bg-zinc-950 min-h-[400px] flex items-center justify-center border-x border-hairline"
          >
            <img
              src={url}
              alt={`Page ${index + 1}`}
              loading={index < 3 ? 'eager' : 'lazy'}
              className="w-full h-auto block"
              onLoad={() => {
                // Preload 3 ahead
                const nextFilename = pages[index + 3];
                if (nextFilename) {
                  const nextImg = new Image();
                  nextImg.src = buildPageUrl(
                    baseUrl,
                    hash,
                    nextFilename,
                    quality
                  );
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
