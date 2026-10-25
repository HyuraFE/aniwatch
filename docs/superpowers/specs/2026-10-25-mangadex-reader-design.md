# Design Spec: Aniwatch Manga Reader & Catalog

**Date:** 2026-10-25  
**Topic:** MangaDex-Powered Manga/Manhwa Reader & Catalog Platform  
**Target Platform:** Vercel (Frontend & Serverless API) + Supabase (Postgres & Auth)  

---

## 1. Intent & The Why

Users want a clean, fast, free web app to discover, search, and read manga and manhwa. Rather than hosting pirated scans, the platform uses the official public **MangaDex API** for metadata and image delivery via MangaDex@Home, with a local **Supabase** cache to bypass rate limits, serve fast repeat views, and track reading progress across multiple languages.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Catalog Browsing & Search:** Search manga by title (fuzzy via MangaDex relevance ordering), filter by tag, status, content rating, and available translation language. Sort by trending / latest update / popularity / rating.
- **Manga Detail & Language Availability:** Detail page shows synopsis, cover, author, status, tags, and a **language availability panel** listing every language the title exists in with its chapter count (e.g. `English 180`, `Indonesian 150`, `Japanese 200`).
- **Language-Filtered Chapter List:** Chapter list filtered by selected language, sortable ascending/descending, with read/unread markers and scanlation group names.
- **Responsive Reader:** Webtoon (vertical scroll) and page-by-page modes, LTR/RTL support, next-page preloading, data-saver quality toggle.
- **Auth & Personalization:** Supabase Auth — reading history, library shelves (Reading / Completed / On hold / Plan to read / Dropped), progress sync.

### Non-Goals
- Hosting raw scan images on owned storage.
- Scraping unauthorized locker sites or bypassing media protections.
- Payments, subscriptions, tokens.
- Comments / social feed (deferred).

### Anti-Goals
- Bulk background crawling on Vercel (serverless timeouts + MangaDex rate limits).
- Direct uncached MangaDex API calls on every page load.
- Serving adult content by default.

---

## 3. Constraints & Infrastructure

- **Vercel serverless:** route handlers max 10–60s. No long-running jobs, no persistent disk.
- **Supabase free tier:** pauses after ~1 week inactivity (one-line note in README: keep a cron or expect a wake-up delay).
- **MangaDex rate limit:** ~5 req/s per IP. Enforced with a token-bucket limiter + exponential backoff, and mitigated by the cache-aside strategy.
- **Images:** served **directly from MangaDex's CDN by the browser** (`uploads.mangadex.org`). The app server never proxies page images — zero image egress cost.
- **MangaDex Acceptable Usage Policy (hard requirement, from api.mangadex.org/docs):**
  1. Credit MangaDex — footer + reader link back to the title on mangadex.org.
  2. Credit scanlation groups on every chapter row and in the reader, and honor group removal requests — a `BLOCKED_GROUP_IDS` env list passed as `excludedGroups[]` on feed calls.
  3. No ads and no paid services. Donations allowed.

---

## 4. Architecture

### 4.1 Tech Stack
- **Framework:** Next.js 15 (App Router, RSC, Server Actions)
- **DB:** Supabase Postgres + Drizzle ORM
- **Auth:** Supabase Auth via `@supabase/ssr`
- **Search:** **MangaDex API proxy with response caching.** No local search index. (See 4.4 — decision rationale.)
- **Styling:** Tailwind CSS + shadcn/ui + Lucide icons
- **State:** URL search params (filters, pagination, language) + React state (reader)

### 4.2 Connection Details
- **Runtime:** Supabase **transaction pooler** (`aws-0-<region>.pooler.supabase.com:6543`, user `postgres.<ref>`) with `postgres(url, { prepare: false })` — required, the pooler does not support prepared statements.
- **Migrations:** direct or session-mode connection (`:5432`), used by `drizzle-kit`.
- **Auth:** `@supabase/ssr` cookie sessions, server components + route handlers + middleware.
- **No Redis.** Search/page caches live in Postgres tables with TTL expiry.

### 4.3 Data Flow

```
BROWSE / SEARCH  ──▶ MangaDex GET /manga?title=&includedTags[]=&order=
                     (result list cached 30 min in search_cache)
                            │
                            ▼
DETAIL PAGE      ──▶ MangaDex GET /manga/{id}?includes[]=cover_art&includes[]=author
                     (availableTranslatedLanguages → language pills, free)
                  ──▶ MangaDex GET /manga/{id}/aggregate?translatedLanguage[]=X → count per language
                            │
                            ▼
CHAPTER LIST     ──▶ MangaDex GET /manga/{id}/feed?translatedLanguage[]=en&limit=100&offset=N
                     (each feed page cached in chapters + feed_pages tables)
                            │
                            ▼
READER           ──▶ MangaDex GET /at-home/server/{chapterId}
                     browser ──▶ uploads.mangadex.org/data/{hash}/{page}   (direct CDN)
```

Everything MangaDex returns is upserted into Supabase as it passes through, so a second visit to the same title is served from Postgres without touching the API.

### 4.4 Search: Proxy + Cache (decided)

**Decision:** Search and browse **proxy the MangaDex `/manga` endpoint directly**, with the response list cached in Postgres (`search_cache`, TTL 30 min). `pg_trgm` local search is **dropped**.

**Why:** A local `pg_trgm` index only covers manga already cached, so a partially-warmed database returns wrong results — searching "hero" shows the 3 titles you happened to visit, not the 40 that match. Fixing that requires bulk-ingesting 100k+ titles, which needs a long-running worker and contradicts the Vercel-only constraint. Proxying is always correct, and MangaDex's `order=relevance` already does relevance ranking.

**Consequence:** browse pages are bounded by MangaDex's pagination (100/page, 10 000 offset cap). Genre + status + rating + language filtering and sorting (trending/latest/popularity) are all MangaDex `/manga` query params, so no local filtering logic is needed.

### 4.5 Chapter Ingestion (decided)

**Decision:** Two separate, purpose-built endpoints — no bulk sync, no `chapters` preload job.

| Need | Endpoint | Cost | Cached as |
|---|---|---|---|
| Language list | `availableTranslatedLanguages` field on `/manga/{id}` | 0 extra requests | `manga.available_languages` |
| Chapter count for one language | `/manga/{id}/aggregate?translatedLanguage[]=X` (count unique chapter keys) | 1 request per language, fetched when its pill is shown, cached 24h | `manga.chapter_counts[X]` |
| Chapter list for one language | `/manga/{id}/feed?translatedLanguage[]=X&limit=100&offset=N` | 1 request per 100 chapters | `chapters` rows + `feed_pages` offset marker |

The chapter list uses **infinite scroll**: each scroll triggers the next 100-chapter feed page, fetched server-side and cached. A 900-chapter series costs 9 requests total, spread across the user's scrolling — never in one serverless invocation.

`/aggregate` returns only volume/chapter counts, so it cannot populate chapter titles, groups, publish dates, or page counts — that is exactly why the feed is separate.

### 4.6 Chapter Duplicates Across Scanlation Groups (decided)

**Decision:** The default chapter list is **deduplicated to the newest upload per chapter number per language**. A "Show all groups" toggle reveals every scanlation group's version.

- Dedup rule: group by `chapter_number`; pick the entry with the latest `published_at`; ties broken by higher `pages_count`.
- Next/previous navigation walks the **currently visible list**, so it never jumps between groups.
- No user-level group preference stored — the toggle is per-session UI state.

### 4.7 Reading Progress & Guests (decided)

**Decision:** Progress works for guests via `localStorage`, and syncs to Supabase on login.

- **Guest:** `localStorage` key `aniwatch:progress` — a map of `chapterId → { mangaId, lastPage, updatedAt }`. Nothing is sent to the server.
- **Logged in:** server is the source of truth; `reading_progress` row per `(userId, chapterId)`.
- **On login:** merge guest `localStorage` into the server — for each guest entry, keep whichever record has the newer `updatedAt` ("latest wins"). Then clear the guest key.
- **Writing:** debounced (1s) via a Server Action, plus a `sendBeacon` call on page hide so closing the tab mid-read still saves.

### 4.8 Content Rating Policy (decided)

Default allowed ratings: `safe`, `suggestive`. `erotica` and `pornographic` are filtered out at the API query layer and are not toggleable in v1. The site ships no adult content by default.

### 4.9 Database Schema (Drizzle)

```typescript
// db/schema.ts

export const manga = pgTable('manga', {
  id: uuid('id').primaryKey(),                 // MangaDex UUID
  title: text('title').notNull(),
  altTitles: jsonb('alt_titles').$type<Record<string, string[]>[]>(),
  description: text('description'),
  coverFileName: text('cover_file_name'),
  status: text('status'),                      // ongoing | completed | hiatus | cancelled
  contentRating: text('content_rating'),        // safe | suggestive
  originalLanguage: text('original_language'),
  availableLanguages: text('available_languages').array().notNull().default(sql`'{}'`),
  chapterCounts: jsonb('chapter_counts').$type<Record<string, number>>().notNull().default({}),
  tags: text('tags').array().notNull().default(sql`'{}'`),
  year: integer('year'),
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [index('manga_title_idx').on(t.title)]);

export const chapters = pgTable('chapters', {
  id: uuid('id').primaryKey(),                 // MangaDex chapter UUID
  mangaId: uuid('manga_id').notNull().references(() => manga.id, { onDelete: 'cascade' }),
  chapterNumber: text('chapter_number').notNull(),
  volumeNumber: text('volume_number'),
  title: text('title'),
  translatedLanguage: text('translated_language').notNull(),
  scanlationGroups: text('scanlation_groups').array().notNull().default(sql`'{}'`),
  pagesCount: integer('pages_count').notNull().default(0),
  externalUrl: text('external_url'),            // set for official chapters (MangaPlus etc.); pages = 0
  isUnavailable: boolean('is_unavailable').notNull().default(false),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('chapters_manga_lang_idx').on(t.mangaId, t.translatedLanguage),
  uniqueIndex('chapters_id_idx').on(t.id),
]);

export const feedPages = pgTable('feed_pages', {
  mangaId: uuid('manga_id').notNull().references(() => manga.id, { onDelete: 'cascade' }),
  language: text('language').notNull(),
  offset: integer('offset').notNull(),
  total: integer('total').notNull(),
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.mangaId, t.language, t.offset] })]);

export const searchCache = pgTable('search_cache', {
  queryKey: text('query_key').primaryKey(),   // hash of the MangaDex query params
  payload: jsonb('payload').$type<{ ids: string[]; total: number }>().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const bookmarks = pgTable('bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  mangaId: uuid('manga_id').notNull().references(() => manga.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('reading'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [uniqueIndex('bookmarks_user_manga_idx').on(t.userId, t.mangaId)]);

export const readingProgress = pgTable('reading_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  mangaId: uuid('manga_id').notNull().references(() => manga.id, { onDelete: 'cascade' }),
  chapterId: uuid('chapter_id').notNull(),
  lastPage: integer('last_page').notNull().default(1),
  isCompleted: boolean('is_completed').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [uniqueIndex('progress_user_chapter_idx').on(t.userId, t.chapterId)]);
```

`chapters.chapter_id` is intentionally **not** a foreign key to `chapters.id`: the chapter row may not be cached yet when progress is written (guest reading a chapter whose feed page was never fetched). Storing the raw UUID keeps progress writes valid in every case.

---

## 5. Pages & Routes

| Route | Rendering | Data source |
|---|---|---|
| `/` | RSC | `GET /manga?order[latestUploadedChapter]=desc&limit=24` (cached 30 min) |
| `/browse` | RSC | `GET /manga` with filter/sort params from the URL |
| `/search?q=` | RSC | `GET /manga?title=&order[relevance]=desc` |
| `/manga/[id]` | RSC | `/manga/{id}` + `/manga/{id}/aggregate` |
| `/manga/[id]/read/[chapterId]` | RSC shell + client reader | `/at-home/server/{chapterId}` |
| `/library` | RSC + auth guard | Supabase `bookmarks` + `reading_progress` |
| `/login`, `/signup` | Client | Supabase Auth |
| `/api/cron/refresh-trending` | Cron | Warms the trending + latest caches |
| `/api/progress` | Route handler | Progress writes (POST) |

---

## 6. Reader UX Requirements

- **Modes:** `webtoon` (vertical scroll, max-width 850px), `single` (one page, arrow keys + tap zones), `double` (desktop, side-by-side spreads).
- **Direction:** manga reads RTL, manhwa/webtoon reads LTR. Derived from `originalLanguage` (`ja` → RTL default) and switchable by the user.
- **Preload:** next 2–3 images via `new Image()` and `loading="eager"` on upcoming pages; `loading="lazy"` beyond that.
- **Controls:** collapsible top bar (manga title, chapter, close) and bottom bar (page slider, prev/next chapter, mode toggle, quality toggle). Auto-hide on scroll/tap.
- **Quality:** `/data/` (full) vs `/data-saver/` (compressed), from the `at-home` payload.
- **Zoom:** double-tap zoom, pinch-to-zoom, pan. Background themes: black, dark grey, sepia, white.
- **Errors:** 404 chapter, 410 (chapter removed), and offline show a friendly message, not a stack trace.

---

## 7. Key MangaDex API Details

```
GET https://api.mangadex.org/manga?title=one+piece&limit=25&offset=0
      &order[relevance]=desc&includes[]=cover_art
      &availableTranslatedLanguage[]=en&contentRating[]=safe&contentRating[]=suggestive

GET https://api.mangadex.org/manga/{id}?includes[]=cover_art&includes[]=author

GET https://api.mangadex.org/manga/{id}/aggregate?translatedLanguage[]=en
      → { volumes: { "1": { count, chapters: { "1": { chapter, id, count, others } } } } }
      (NOT grouped by language — one call per language)

GET https://api.mangadex.org/manga/{id}/feed?translatedLanguage[]=en&limit=100&offset=0
      → Chapter[] with pages, chapter, volume, title, publishAt, groups

GET https://api.mangadex.org/at-home/server/{chapterId}
      → { baseUrl, chapter: { hash, data: [...], dataSaver: [...] } }

Page URL: {baseUrl}/data/{hash}/{filename}
          or {baseUrl}/data-saver/{hash}/{filename}
```

Cover art: `https://uploads.mangadex.org/covers/{mangaId}/{coverFileName}.512.jpg` (and `.256.jpg` for grid thumbnails).

### 7.1 Verified Against the Live API (2026-10-25)

| Fact | Consequence |
|---|---|
| `attributes.title` and `description` are localized maps (`{"ja-ro": "One Piece"}`), not strings | Resolve display title at ingest: `en` → `ja-ro` → first value; also search `altTitles` for `en`. Description: `en` → first. |
| `attributes.availableTranslatedLanguages` exists on every manga | Language pills cost zero extra requests. |
| `/manga` `total` ≈ 95 000 | Confirms bulk ingestion is out; proxy search stands. |
| `tags[].attributes.group` ∈ `genre` / `theme` / `format` / `content` | Browse filter UI groups tags by this field; tag list from `GET /manga/tag`, cached 7 days. |
| `/aggregate` is **not** grouped by language; chapters nest under volumes (`"none"` = no volume); each has `id`, `others[]` (other groups' chapter IDs), `isUnavailable` | One call per language; count = unique chapter keys across volumes. |
| Feed chapters may have `externalUrl` set and `pages: 0` (official MangaPlus releases) | Chapter row shows "Read on MangaPlus ↗"; reader route redirects out instead of calling `at-home`. |
| `isUnavailable: true` chapters exist | Render greyed out, not clickable. |
| `includes[]=scanlation_group` embeds group `name`, `official` flag | Group credit (required by MangaDex policy) needs no extra request. |
| `/at-home/server/{id}` | **Not yet verified live** (fetch tool blocked); shape taken from MangaDex docs. Verify in plan task 1. |

---

## 8. Builder's Call (things decided without asking)

- Dropped `pg_trgm`; search proxies MangaDex with a Postgres TTL cache (4.4).
- Chapters ingested lazily via `/aggregate` + paginated `/feed` (4.5).
- Chapter list deduplicates to the newest group per chapter number, with a "show all groups" toggle (4.6).
- Guest progress via `localStorage`, merged into the account on login, latest-wins (4.7).
- Adult ratings excluded by default and not toggleable in v1 (4.8).
- Postgres holds both the query cache and the feed-page offsets; no Redis, no external worker.
- Supabase transaction pooler + `prepare: false` at runtime; direct/session connection for migrations (4.2).

## 9. Left to the Builder

- Exact shadcn/ui component selection per screen.
- Theme tokens and the reader background palette.
- The token-bucket limiter implementation.
- Chapter number sort: numeric-aware comparison with a fallback for `Extra`, `12.5`, `12-13`.
- Vercel Cron route guarded by `CRON_SECRET`.
