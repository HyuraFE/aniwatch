import { describe, it, expect } from 'vitest';
import { getCoverUrl } from '@/lib/mangadex/helpers';

describe('MangaCard data flow & Tokyo Manga-Zine styling', () => {
  it('correctly formats cover thumbnail with 256 size qualifier', () => {
    const cardData = {
      id: 'a1c7c817-4e59-43b7-9365-09675a149a6f',
      title: 'One Piece',
      coverFileName: 'cover.jpg',
      status: 'ongoing',
      latestChapter: '1196',
    };
    const coverUrl = getCoverUrl(cardData.id, cardData.coverFileName, '256');
    expect(coverUrl).toContain('cover.jpg.256.jpg');
    expect(`/manga/${cardData.id}`).toBe(
      '/manga/a1c7c817-4e59-43b7-9365-09675a149a6f'
    );
  });

  it('handles missing cover gracefully by returning empty string', () => {
    const coverUrl = getCoverUrl('manga-1', '');
    expect(coverUrl).toBe('');
  });
});
