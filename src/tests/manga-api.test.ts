import { describe, it, expect, vi } from 'vitest';
import * as client from '@/lib/mangadex/client';
import {
  searchManga,
  getMangaDetail,
  getLanguageChapterCount,
} from '@/lib/mangadex/api';

describe('Manga Ingestion & API services', () => {
  it('parses search results and formats catalog items', async () => {
    const mockMangaDexResponse = {
      result: 'ok',
      total: 1,
      data: [
        {
          id: 'm-1',
          type: 'manga',
          attributes: {
            title: { en: 'Dandadan' },
            altTitles: [{ ja: 'ダンダダン' }],
            description: { en: 'Occult action' },
            status: 'ongoing',
            year: 2021,
            originalLanguage: 'ja',
            availableTranslatedLanguages: ['en', 'id'],
            tags: [
              {
                id: 't-1',
                type: 'tag',
                attributes: { name: { en: 'Action' }, group: 'genre' },
              },
            ],
            latestUploadedChapter: '172',
          },
          relationships: [
            {
              id: 'cov-1',
              type: 'cover_art',
              attributes: { fileName: 'cover.jpg' },
            },
          ],
        },
      ],
    };

    const fetchSpy = vi
      .spyOn(client, 'mangadexFetch')
      .mockResolvedValueOnce(mockMangaDexResponse as any);

    const res = await searchManga({ title: 'Dandadan' });
    expect(res.total).toBe(1);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].title).toBe('Dandadan');
    expect(res.items[0].coverUrl).toContain('cover.jpg.256.jpg');
    expect(res.items[0].availableLanguages).toEqual(['en', 'id']);

    fetchSpy.mockRestore();
  });

  it('aggregates unique chapters count for a language', async () => {
    const mockAggregate = {
      result: 'ok',
      volumes: {
        '1': {
          volume: '1',
          count: 2,
          chapters: {
            '1': { chapter: '1', id: 'c1', others: [], count: 1 },
            '2': { chapter: '2', id: 'c2', others: [], count: 1 },
          },
        },
        none: {
          volume: 'none',
          count: 1,
          chapters: {
            '3': { chapter: '3', id: 'c3', others: [], count: 1 },
          },
        },
      },
    };

    const fetchSpy = vi
      .spyOn(client, 'mangadexFetch')
      .mockResolvedValueOnce(mockAggregate as any);

    const count = await getLanguageChapterCount('m-1', 'en');
    expect(count).toBe(3);

    fetchSpy.mockRestore();
  });
});
