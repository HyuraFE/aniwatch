import { LocalizedString } from './types';

/**
 * Resolves a readable title from MangaDex title maps.
 * Priority: en -> ja-ro -> ko-ro -> first key in title -> altTitles(en) -> 'Untitled'
 */
export function getPreferredTitle(
  title: LocalizedString,
  altTitles?: LocalizedString[]
): string {
  if (!title) return 'Untitled';

  if (title.en && title.en.trim()) return title.en.trim();
  if (title['ja-ro'] && title['ja-ro'].trim()) return title['ja-ro'].trim();
  if (title['ko-ro'] && title['ko-ro'].trim()) return title['ko-ro'].trim();

  const firstKey = Object.keys(title)[0];
  if (firstKey && title[firstKey]?.trim()) {
    return title[firstKey].trim();
  }

  if (altTitles && Array.isArray(altTitles)) {
    for (const alt of altTitles) {
      if (alt.en && alt.en.trim()) return alt.en.trim();
    }
    for (const alt of altTitles) {
      const k = Object.keys(alt)[0];
      if (k && alt[k]?.trim()) return alt[k].trim();
    }
  }

  return 'Untitled';
}

/**
 * Resolves synopsis description with fallback: en -> first available language
 */
export function getPreferredDescription(desc: LocalizedString): string {
  if (!desc) return '';
  if (desc.en && desc.en.trim()) return desc.en.trim();

  const firstKey = Object.keys(desc)[0];
  if (firstKey && desc[firstKey]?.trim()) {
    return desc[firstKey].trim();
  }

  return '';
}

/**
 * Generates MangaDex cover image URLs.
 *
 * Images are routed through /api/image-proxy because MangaDex's CDN hostname
 * is blocked at the DNS/TLS layer by some ISPs (notably Indonesian providers
 * running Internet Positif). The browser cannot reach uploads.mangadex.org
 * directly, so the app server fetches and streams it instead.
 *
 * @param mangaId Manga UUID
 * @param coverFileName Cover art file name from relationship attributes
 * @param size '256' for grid cards, '512' for details, or original
 */
export function getCoverUrl(
  mangaId: string,
  coverFileName: string,
  size?: '256' | '512'
): string {
  if (!coverFileName) return '';
  const base = `https://uploads.mangadex.org/covers/${mangaId}/${coverFileName}`;
  const sized = size === '256' ? `${base}.256.jpg` : size === '512' ? `${base}.512.jpg` : base;
  return `/api/image-proxy?url=${encodeURIComponent(sized)}`;
}
