import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  manga,
  chapters,
  feedPages,
  searchCache,
  type Manga,
  type Chapter,
} from '@/db/schema';
import { mangadexFetch } from './client';
import {
  getPreferredTitle,
  getPreferredDescription,
  getCoverUrl,
} from './helpers';
import { deduplicateChapters } from './dedup';
import type {
  MangaDexManga,
  MangaDexChapter,
  MangaDexAggregateResponse,
} from './types';

export interface SearchFilters {
  title?: string;
  includedTags?: string[];
  status?: string[];
  originalLanguage?: string[];
  availableTranslatedLanguage?: string[];
  order?: Record<string, 'asc' | 'desc'>;
  limit?: number;
  offset?: number;
}

export interface CatalogItem {
  id: string;
  title: string;
  coverFileName: string | null;
  coverUrl: string;
  status: string | null;
  year: number | null;
  originalLanguage: string | null;
  availableLanguages: string[];
  tags: string[];
  latestUploadedChapter: string | null;
}

function extractCoverFileName(item: MangaDexManga): string | null {
  const coverRel = item.relationships?.find((r) => r.type === 'cover_art');
  return coverRel?.attributes?.fileName || null;
}

function toCatalogItem(row: Manga): CatalogItem {
  return {
    id: row.id,
    title: row.title,
    coverFileName: row.coverFileName,
    coverUrl: row.coverFileName
      ? getCoverUrl(row.id, row.coverFileName, '256')
      : '',
    status: row.status,
    year: row.year,
    originalLanguage: row.originalLanguage,
    availableLanguages: row.availableLanguages,
    tags: row.tags,
    latestUploadedChapter: null,
  };
}

/**
 * Searches and browses manga using MangaDex API proxied through a 30-min Postgres cache
 */
export async function searchManga(
  filters: SearchFilters = {}
): Promise<{ items: CatalogItem[]; total: number }> {
  const limit = Math.min(filters.limit || 24, 100);
  const offset = filters.offset || 0;

  const queryParams: Record<string, any> = {
    limit,
    offset,
    'includes[]': ['cover_art'],
    'contentRating[]': ['safe', 'suggestive'],
  };

  if (filters.title?.trim()) {
    queryParams['title'] = filters.title.trim();
    queryParams['order[relevance]'] = 'desc';
  } else if (filters.order) {
    for (const [key, dir] of Object.entries(filters.order)) {
      queryParams[`order[${key}]`] = dir;
    }
  } else {
    queryParams['order[latestUploadedChapter]'] = 'desc';
  }

  if (filters.includedTags && filters.includedTags.length > 0) {
    queryParams['includedTags[]'] = filters.includedTags;
  }
  if (filters.status && filters.status.length > 0) {
    queryParams['status[]'] = filters.status;
  }
  if (filters.originalLanguage && filters.originalLanguage.length > 0) {
    queryParams['originalLanguage[]'] = filters.originalLanguage;
  }
  if (
    filters.availableTranslatedLanguage &&
    filters.availableTranslatedLanguage.length > 0
  ) {
    queryParams['availableTranslatedLanguage[]'] =
      filters.availableTranslatedLanguage;
  }

  const queryKey = JSON.stringify(queryParams);

  // 1. Check searchCache in Supabase/Postgres
  try {
    const cached = await db
      .select()
      .from(searchCache)
      .where(
        and(
          eq(searchCache.queryKey, queryKey),
          sql`${searchCache.expiresAt} > NOW()`
        )
      )
      .limit(1);

    if (cached.length > 0 && cached[0].payload.ids.length > 0) {
      const ids = cached[0].payload.ids;
      const rows = await db
        .select()
        .from(manga)
        .where(sql`${manga.id} = ANY(${ids}::uuid[])`);

      // Preserve ranking order
      const rowMap = new Map(rows.map((r) => [r.id, r]));
      const ordered = ids
        .map((id) => rowMap.get(id))
        .filter((r): r is Manga => Boolean(r))
        .map(toCatalogItem);

      return { items: ordered, total: cached[0].payload.total };
    }
  } catch {
    // If DB read fails (offline test or unreachable), fall through to live fetch
  }

  // 2. Fetch from MangaDex
  const response = await mangadexFetch<{
    result: string;
    data: MangaDexManga[];
    total: number;
  }>('/manga', queryParams);

  const ids: string[] = [];
  const catalogItems: CatalogItem[] = [];

  for (const item of response.data || []) {
    const title = getPreferredTitle(
      item.attributes.title,
      item.attributes.altTitles
    );
    const coverFileName = extractCoverFileName(item);
    const tags = (item.attributes.tags || [])
      .map((t) => t.attributes?.name?.en)
      .filter((n): n is string => Boolean(n));

    ids.push(item.id);
    catalogItems.push({
      id: item.id,
      title,
      coverFileName,
      coverUrl: coverFileName ? getCoverUrl(item.id, coverFileName, '256') : '',
      status: item.attributes.status,
      year: item.attributes.year,
      originalLanguage: item.attributes.originalLanguage,
      availableLanguages: item.attributes.availableTranslatedLanguages || [],
      tags,
      latestUploadedChapter: item.attributes.latestUploadedChapter,
    });

    // Upsert into manga table
    try {
      await db
        .insert(manga)
        .values({
          id: item.id,
          title,
          altTitles: item.attributes.altTitles as any,
          description: getPreferredDescription(item.attributes.description),
          coverFileName,
          status: item.attributes.status,
          contentRating: item.attributes.contentRating,
          originalLanguage: item.attributes.originalLanguage,
          availableLanguages:
            item.attributes.availableTranslatedLanguages || [],
          tags,
          year: item.attributes.year,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: manga.id,
          set: {
            title,
            coverFileName,
            status: item.attributes.status,
            availableLanguages:
              item.attributes.availableTranslatedLanguages || [],
            tags,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          },
        });
    } catch {
      // Non-fatal during offline / mock runs
    }
  }

  // 3. Cache the search result for 30 minutes
  try {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await db
      .insert(searchCache)
      .values({
        queryKey,
        payload: { ids, total: response.total },
        expiresAt,
      })
      .onConflictDoUpdate({
        target: searchCache.queryKey,
        set: {
          payload: { ids, total: response.total },
          expiresAt,
        },
      });
  } catch {
    // Non-fatal
  }

  return { items: catalogItems, total: response.total };
}

/**
 * Gets manga details. Cache-aside against Supabase `manga` table.
 */
export async function getMangaDetail(
  mangaId: string
): Promise<Manga & { coverUrl: string }> {
  // 1. Check local cache
  try {
    const local = await db
      .select()
      .from(manga)
      .where(eq(manga.id, mangaId))
      .limit(1);

    if (local.length > 0) {
      const ageHours =
        (Date.now() - new Date(local[0].lastSyncedAt).getTime()) / 3600000;
      if (ageHours < 24) {
        return {
          ...local[0],
          coverUrl: local[0].coverFileName
            ? getCoverUrl(local[0].id, local[0].coverFileName, '512')
            : '',
        };
      }
    }
  } catch {
    // Fall through
  }

  // 2. Fetch fresh from MangaDex
  const res = await mangadexFetch<{
    result: string;
    data: MangaDexManga;
  }>(`/manga/${mangaId}`, {
    'includes[]': ['cover_art', 'author', 'artist'],
  });

  const item = res.data;
  const title = getPreferredTitle(
    item.attributes.title,
    item.attributes.altTitles
  );
  const coverFileName = extractCoverFileName(item);
  const tags = (item.attributes.tags || [])
    .map((t) => t.attributes?.name?.en)
    .filter((n): n is string => Boolean(n));

  const values = {
    id: item.id,
    title,
    altTitles: item.attributes.altTitles as any,
    description: getPreferredDescription(item.attributes.description),
    coverFileName,
    status: item.attributes.status,
    contentRating: item.attributes.contentRating,
    originalLanguage: item.attributes.originalLanguage,
    availableLanguages: item.attributes.availableTranslatedLanguages || [],
    tags,
    year: item.attributes.year,
    lastSyncedAt: new Date(),
  };

  try {
    const upserted = await db
      .insert(manga)
      .values(values)
      .onConflictDoUpdate({
        target: manga.id,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();

    return {
      ...upserted[0],
      coverUrl: coverFileName ? getCoverUrl(item.id, coverFileName, '512') : '',
    };
  } catch {
    return {
      ...values,
      chapterCounts: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      coverUrl: coverFileName ? getCoverUrl(item.id, coverFileName, '512') : '',
    };
  }
}

/**
 * Gets unique chapter count for a specific language via /manga/{id}/aggregate
 */
export async function getLanguageChapterCount(
  mangaId: string,
  language: string
): Promise<number> {
  const res = await mangadexFetch<MangaDexAggregateResponse>(
    `/manga/${mangaId}/aggregate`,
    {
      'translatedLanguage[]': [language],
    }
  );

  const seenChapters = new Set<string>();
  for (const vol of Object.values(res.volumes || {})) {
    for (const chNum of Object.keys(vol.chapters || {})) {
      seenChapters.add(chNum);
    }
  }

  return seenChapters.size;
}

/**
 * Fetches a 100-chapter feed slice for infinite scroll.
 * Deduplicates multiple scanlation groups unless showAllGroups is true.
 */
export async function getChapterFeed(
  mangaId: string,
  language: string,
  offset: number = 0,
  showAllGroups: boolean = false
): Promise<{ chapters: Chapter[]; total: number }> {
  const limit = 100;

  // 1. Fetch from MangaDex /feed
  const res = await mangadexFetch<{
    result: string;
    data: MangaDexChapter[];
    total: number;
  }>(`/manga/${mangaId}/feed`, {
    'translatedLanguage[]': [language],
    limit,
    offset,
    'order[chapter]': 'desc',
    'includes[]': ['scanlation_group'],
    'contentRating[]': ['safe', 'suggestive'],
  });

  const parsedChapters: Chapter[] = [];

  for (const item of res.data || []) {
    const scanlationRel = item.relationships?.filter(
      (r) => r.type === 'scanlation_group'
    );
    const scanlationGroups = (scanlationRel || [])
      .map((r) => r.attributes?.name)
      .filter((name): name is string => Boolean(name));

    const chapterRow: Chapter = {
      id: item.id,
      mangaId,
      chapterNumber: item.attributes.chapter || 'Extra',
      volumeNumber: item.attributes.volume,
      title: item.attributes.title,
      translatedLanguage: item.attributes.translatedLanguage,
      scanlationGroups,
      pagesCount: item.attributes.pages || 0,
      externalUrl: item.attributes.externalUrl,
      isUnavailable: item.attributes.isUnavailable || false,
      publishedAt: item.attributes.publishAt
        ? new Date(item.attributes.publishAt)
        : null,
      createdAt: item.attributes.createdAt
        ? new Date(item.attributes.createdAt)
        : new Date(),
    };

    parsedChapters.push(chapterRow);

    // Upsert into chapters table
    try {
      await db
        .insert(chapters)
        .values(chapterRow)
        .onConflictDoNothing();
    } catch {
      // Non-fatal
    }
  }

  // Record feed page marker
  try {
    await db
      .insert(feedPages)
      .values({
        mangaId,
        language,
        offset,
        total: res.total,
        fetchedAt: new Date(),
      })
      .onConflictDoNothing();
  } catch {
    // Non-fatal
  }

  const resultList = showAllGroups
    ? parsedChapters
    : deduplicateChapters(parsedChapters);

  return { chapters: resultList, total: res.total };
}
