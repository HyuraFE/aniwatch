import { describe, it, expect } from 'vitest';
import {
  getPreferredTitle,
  getPreferredDescription,
  getCoverUrl,
} from '@/lib/mangadex/helpers';

describe('MangaDex helpers', () => {
  it('resolves title with fallback en -> ja-ro -> first entry', () => {
    expect(getPreferredTitle({ 'ja-ro': 'One Piece', 'ja': 'ワンピース' })).toBe(
      'One Piece'
    );
    expect(getPreferredTitle({ en: 'Solo Leveling' })).toBe('Solo Leveling');
    expect(getPreferredTitle({ fr: 'Attaque des Titans' })).toBe(
      'Attaque des Titans'
    );
    expect(getPreferredTitle({}, [{ en: 'Alt Title' }])).toBe('Alt Title');
    expect(getPreferredTitle({})).toBe('Untitled');
  });

  it('resolves description with fallback en -> first entry', () => {
    expect(
      getPreferredDescription({ en: 'Pirate adventure.', es: 'Aventura pirata.' })
    ).toBe('Pirate adventure.');
    expect(getPreferredDescription({ id: 'Cerita bajak laut.' })).toBe(
      'Cerita bajak laut.'
    );
    expect(getPreferredDescription({})).toBe('');
  });

  it('generates MangaDex cover URLs with size qualifier', () => {
    const url = getCoverUrl('manga-123', 'cover-abc.jpg', '512');
    expect(url).toBe(
      'https://uploads.mangadex.org/covers/manga-123/cover-abc.jpg.512.jpg'
    );
    const thumbUrl = getCoverUrl('manga-123', 'cover-abc.jpg', '256');
    expect(thumbUrl).toBe(
      'https://uploads.mangadex.org/covers/manga-123/cover-abc.jpg.256.jpg'
    );
  });
});
