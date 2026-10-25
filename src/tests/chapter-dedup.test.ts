import { describe, it, expect } from 'vitest';
import { deduplicateChapters } from '@/lib/mangadex/dedup';

describe('Chapter deduplication', () => {
  it('deduplicates multiple groups for same chapter number picking newest upload', () => {
    const list = [
      {
        id: '1',
        chapterNumber: '10',
        publishedAt: '2026-01-01T00:00:00Z',
        pagesCount: 20,
        scanlationGroups: ['Group A'],
      },
      {
        id: '2',
        chapterNumber: '10',
        publishedAt: '2026-01-02T00:00:00Z',
        pagesCount: 20,
        scanlationGroups: ['Group B'],
      },
      {
        id: '3',
        chapterNumber: '9',
        publishedAt: '2025-12-31T00:00:00Z',
        pagesCount: 18,
        scanlationGroups: ['Group A'],
      },
    ];
    const deduped = deduplicateChapters(list as any);
    expect(deduped).toHaveLength(2);
    expect(deduped.find((c) => c.chapterNumber === '10')?.id).toBe('2');
  });

  it('sorts chapter numbers numerically descending', () => {
    const list = [
      { id: '1', chapterNumber: '2', publishedAt: '2026-01-01Z' },
      { id: '2', chapterNumber: '10', publishedAt: '2026-01-01Z' },
      { id: '3', chapterNumber: '1.5', publishedAt: '2026-01-01Z' },
    ];
    const deduped = deduplicateChapters(list as any);
    expect(deduped.map((c) => c.chapterNumber)).toEqual(['10', '2', '1.5']);
  });

  it('breaks publish-date ties using higher page count', () => {
    const list = [
      {
        id: 'a',
        chapterNumber: '5',
        publishedAt: '2026-01-01Z',
        pagesCount: 10,
      },
      {
        id: 'b',
        chapterNumber: '5',
        publishedAt: '2026-01-01Z',
        pagesCount: 25,
      },
    ];
    const deduped = deduplicateChapters(list as any);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe('b');
  });

  it('keeps non-numeric chapter labels such as Extra and Oneside', () => {
    const list = [
      { id: '1', chapterNumber: 'Extra', publishedAt: '2026-01-03Z' },
      { id: '2', chapterNumber: 'Oneside', publishedAt: '2026-01-02Z' },
      { id: '3', chapterNumber: '3', publishedAt: '2026-01-01Z' },
    ];
    const deduped = deduplicateChapters(list as any);
    // Numeric chapters sort first (descending), then non-numeric labels by date
    expect(deduped.map((c) => c.chapterNumber)).toEqual([
      '3',
      'Extra',
      'Oneside',
    ]);
  });

  it('treats 12.5 as distinct from 12', () => {
    const list = [
      { id: '1', chapterNumber: '12', publishedAt: '2026-01-02Z' },
      { id: '2', chapterNumber: '12.5', publishedAt: '2026-01-01Z' },
    ];
    const deduped = deduplicateChapters(list as any);
    expect(deduped).toHaveLength(2);
  });
});
