import { describe, it, expect } from 'vitest';
import { buildPageUrl } from '@/lib/mangadex/reader';

describe('At-Home page URL generator', () => {
  it('constructs correct high-quality and data-saver image URLs', () => {
    const baseUrl = 'https://uploads.mangadex.org';
    const hash = 'abc123hash';
    const filename = '1-x.jpg';

    const fullUrl = buildPageUrl(baseUrl, hash, filename, 'full');
    const saverUrl = buildPageUrl(baseUrl, hash, filename, 'saver');

    expect(fullUrl).toBe(
      'https://uploads.mangadex.org/data/abc123hash/1-x.jpg'
    );
    expect(saverUrl).toBe(
      'https://uploads.mangadex.org/data-saver/abc123hash/1-x.jpg'
    );
  });

  it('returns empty string when baseUrl or hash is missing', () => {
    expect(buildPageUrl('', 'abc', '1.jpg', 'full')).toBe('');
    expect(buildPageUrl('https://uploads.mangadex.org', '', '1.jpg', 'full')).toBe(
      ''
    );
  });
});
