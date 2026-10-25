export type ReaderQuality = 'full' | 'saver';

/**
 * Builds a chapter page image URL from the MangaDex@Home payload.
 * @param baseUrl e.g. https://uploads.mangadex.org
 * @param hash    chapter hash from the at-home payload
 * @param filename page filename from the at-home payload
 * @param quality 'full' for /data/, 'saver' for /data-saver/
 */
export function buildPageUrl(
  baseUrl: string,
  hash: string,
  filename: string,
  quality: ReaderQuality = 'full'
): string {
  if (!baseUrl || !hash || !filename) return '';
  const path = quality === 'saver' ? 'data-saver' : 'data';
  return `${baseUrl}/${path}/${hash}/${filename}`;
}
