import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  uuid,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';

/**
 * 1. Manga Table
 * Primary catalog record cached from MangaDex /manga/{id}
 */
export const manga = pgTable(
  'manga',
  {
    id: uuid('id').primaryKey(),
    title: text('title').notNull(),
    altTitles: jsonb('alt_titles').$type<Record<string, string[]>[]>(),
    description: text('description'),
    coverFileName: text('cover_file_name'),
    status: text('status'), // ongoing | completed | hiatus | cancelled
    contentRating: text('content_rating'), // safe | suggestive
    originalLanguage: text('original_language'),
    availableLanguages: text('available_languages')
      .array()
      .notNull()
      .default(sql`'{}'`),
    chapterCounts: jsonb('chapter_counts')
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'`),
    year: integer('year'),
    lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('manga_title_idx').on(t.title)]
);

export type Manga = typeof manga.$inferSelect;
export type NewManga = typeof manga.$inferInsert;

/**
 * 2. Chapters Table
 * Cached from MangaDex /manga/{id}/feed
 */
export const chapters = pgTable(
  'chapters',
  {
    id: uuid('id').primaryKey(),
    mangaId: uuid('manga_id')
      .notNull()
      .references(() => manga.id, { onDelete: 'cascade' }),
    chapterNumber: text('chapter_number').notNull(),
    volumeNumber: text('volume_number'),
    title: text('title'),
    translatedLanguage: text('translated_language').notNull(),
    scanlationGroups: text('scanlation_groups')
      .array()
      .notNull()
      .default(sql`'{}'`),
    pagesCount: integer('pages_count').notNull().default(0),
    externalUrl: text('external_url'), // populated for official releases (MangaPlus etc)
    isUnavailable: boolean('is_unavailable').notNull().default(false),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('chapters_manga_lang_idx').on(t.mangaId, t.translatedLanguage),
    index('chapters_manga_num_idx').on(t.mangaId, t.chapterNumber),
  ]
);

export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;

/**
 * 3. Feed Pages Marker Table
 * Tracks which 100-chapter feed pages have been fetched & cached in Postgres
 */
export const feedPages = pgTable(
  'feed_pages',
  {
    mangaId: uuid('manga_id')
      .notNull()
      .references(() => manga.id, { onDelete: 'cascade' }),
    language: text('language').notNull(),
    offset: integer('offset').notNull(),
    total: integer('total').notNull(),
    fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.mangaId, t.language, t.offset] }),
  ]
);

export type FeedPage = typeof feedPages.$inferSelect;

/**
 * 4. Search & Browse Query Cache
 * Caches MangaDex search/browse query results for 30 minutes
 */
export const searchCache = pgTable('search_cache', {
  queryKey: text('query_key').primaryKey(), // sha256 or stringified query params
  payload: jsonb('payload')
    .$type<{ ids: string[]; total: number }>()
    .notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

export type SearchCache = typeof searchCache.$inferSelect;

/**
 * 5. User Bookmarks / Library Shelves
 */
export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(), // references auth.users in Supabase
    mangaId: uuid('manga_id')
      .notNull()
      .references(() => manga.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('reading'), // reading | completed | on_hold | plan_to_read | dropped
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('bookmarks_user_manga_idx').on(t.userId, t.mangaId)]
);

export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;

/**
 * 6. User Reading Progress
 * Note: chapterId intentionally not a foreign key so guest reads can sync before chapter feed is cached
 */
export const readingProgress = pgTable(
  'reading_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(), // references auth.users in Supabase
    mangaId: uuid('manga_id')
      .notNull()
      .references(() => manga.id, { onDelete: 'cascade' }),
    chapterId: uuid('chapter_id').notNull(),
    lastPage: integer('last_page').notNull().default(1),
    isCompleted: boolean('is_completed').notNull().default(false),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [uniqueIndex('progress_user_chapter_idx').on(t.userId, t.chapterId)]
);

export type ReadingProgress = typeof readingProgress.$inferSelect;
export type NewReadingProgress = typeof readingProgress.$inferInsert;
