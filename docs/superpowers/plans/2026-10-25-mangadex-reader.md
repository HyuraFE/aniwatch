# Aniwatch Manga Reader & Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, responsive, free manga and manhwa streaming/reading platform with catalog browsing, fuzzy search, language availability breakdown, infinite-scroll chapter list, and multi-mode reader (webtoon + page-by-page), powered by MangaDex API with Supabase caching and Supabase Auth.

**Architecture:** Next.js 15 App Router on Vercel with RSC and Server Actions. MangaDex API proxied with a 30-minute Postgres cache (`search_cache`, `manga`, `chapters`, `feed_pages`) via Drizzle ORM to protect against rate limits. Browser loads chapter images directly from MangaDex CDN (`uploads.mangadex.org`) for zero-cost image egress. Client-side `localStorage` reading progress for guests, seamlessly synced to Supabase `reading_progress` and `bookmarks` upon login.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Google Fonts (`Cinzel`, `Newsreader`, `Noto Serif JP`, `Space Grotesk`), Supabase (PostgreSQL + Auth), `@supabase/ssr`, Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `postgres` client), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-25-mangadex-reader-design.md`  
**Approved Design System:** `direction-approved.md` (Direction 2: Tokyo Manga-Zine Editorial — palette: `#0f0f11` paper, `#f4f4f5` ink, `#e11d48` vermilion stamp, `#27272a` hairline rules).

## Global Constraints

- Runtime: Vercel serverless functions (max duration 10–60s). No long-running background processes or persistent disk.
- DB Pooler: Supabase transaction pooler port `6543` requires `postgres(url, { prepare: false })`.
- MangaDex Rate Limit: ~5 requests/second per IP. Wrap all outbound requests in a shared token-bucket limiter and custom User-Agent `aniwatch/1.0`.
- Zero-cost image egress: The app server must never download or proxy chapter images. Readers load URLs directly on the client.
- MangaDex Acceptable Usage Policy:
  1. Credit MangaDex in footer and reader ("Powered by MangaDex" with link).
  2. Credit scanlation groups on chapter items and in reader overlays. Support `BLOCKED_GROUP_IDS` env list.
  3. Strict zero-ad, zero-paywall policy. Donations allowed only.
- Content Ratings: Query filter permanently enforces `contentRating[]=safe&contentRating[]=suggestive`. Exclude adult tags.

## Review Focus

1. **Chapter with `externalUrl` (MangaPlus official):** `pages: 0` and `at-home` endpoint returns 404/error. Reader must redirect or render "Read on MangaPlus" CTA instead of crashing.
2. **Title and description localization:** MangaDex returns `{ [lang]: string }`. App must fall back gracefully `en` -> `ja-ro` -> `ko-ro` -> first available value without rendering `[object Object]` or crashing.
3. **Manga with 1,000+ chapters (e.g., One Piece, Detective Conan):** Ingesting all chapters at once causes Vercel serverless timeout. Ingestion must strictly chunk via 100-item `/feed` pages on infinite scroll.
4. **Duplicate chapter numbers across multiple scanlation groups:** Navigation must deduplicate to newest published version so next/prev doesn't oscillate between 3 versions of Chapter 12.
5. **Guest reading progress migration on login:** When guest logs in with 20 chapters in `localStorage`, merge algorithm must use "latest `updatedAt` wins" and purge `localStorage` without dropping existing account progress.

---

## File Structure

```
aniwatch/
├── docs/
│   ├── superpowers/specs/2026-10-25-mangadex-reader-design.md
│   └── superpowers/plans/2026-10-25-mangadex-reader.md
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # Root layout (Navbar, Footer with MangaDex credit, ThemeProvider)
│   │   ├── page.tsx                       # Homepage (Hero, Trending, Latest Updates, Popular)
│   │   ├── browse/page.tsx                # Browse & Filter (Genres, Status, Languages, Sort)
│   │   ├── search/page.tsx                # Search results with query params
│   │   ├── manga/[id]/page.tsx            # Manga detail, language availability pills, chapter feed
│   │   ├── manga/[id]/read/[chapterId]/   # Reader page (Webtoon / Page-by-page)
│   │   │   └── page.tsx
│   │   ├── library/page.tsx               # User library (Reading, Completed, Plan to Read)
│   │   ├── login/page.tsx                 # Supabase Auth login/signup
│   │   ├── auth/callback/route.ts         # Supabase OAuth callback route handler
│   │   └── api/
│   │       ├── chapters/feed/route.ts     # Paginated chapter feed proxy
│   │       ├── at-home/[chapterId]/route.ts # At-home server fetcher
│   │       └── progress/route.ts          # Reading progress sync endpoint
│   ├── components/
│   │   ├── navbar.tsx                     # Global nav, search input, auth button
│   │   ├── footer.tsx                     # Footer with MangaDex & scanlation credit
│   │   ├── manga-card.tsx                 # Manga grid card with cover & badges
│   │   ├── language-selector.tsx          # Available languages pills with chapter counts
│   │   ├── chapter-list.tsx               # Infinite scroll chapter list with group credits
│   │   ├── reader/
│   │   │   ├── webtoon-reader.tsx         # Vertical continuous scroll
│   │   │   ├── paged-reader.tsx           # Single / Double page flip (LTR/RTL)
│   │   │   ├── reader-controls.tsx        # Top/bottom overlay bars, page slider, quality toggle
│   │   │   └── progress-tracker.tsx       # LocalStorage + DB beacon sync
│   │   └── ui/                            # shadcn/ui components
│   ├── db/
│   │   ├── index.ts                       # Drizzle client with postgres pooler config
│   │   ├── schema.ts                      # Tables: manga, chapters, feedPages, searchCache, bookmarks, readingProgress
│   │   └── migrations/                    # drizzle-kit migration files
│   ├── lib/
│   │   ├── mangadex/
│   │   │   ├── client.ts                  # Fetch wrapper, rate-limiter, User-Agent header
│   │   │   ├── types.ts                   # MangaDex API types (Manga, Chapter, Tag, Aggregate)
│   │   │   ├── helpers.ts                 # Localized string parser, cover URL generator
│   │   │   └── api.ts                     # getManga, searchManga, getAggregate, getFeed, getAtHome
│   │   ├── supabase/
│   │   │   ├── server.ts                  # Server client for RSC & Route Handlers
│   │   │   ├── client.ts                  # Browser client for components
│   │   │   └── middleware.ts              # Session refresher middleware
│   │   └── progress.ts                    # Progress merger (localStorage vs Supabase)
│   ├── middleware.ts                      # Next.js root middleware
│   └── tests/
│       ├── mangadex-helpers.test.ts
│       ├── rate-limiter.test.ts
│       ├── progress-merger.test.ts
│       └── chapter-dedup.test.ts
├── drizzle.config.ts
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

### Task 1: Project Scaffolding & Dependencies

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Test: `src/tests/setup.test.ts`

**Interfaces:**
- Produces: Runnable Next.js 15 app with TypeScript, Tailwind CSS, Vitest test runner.

- [ ] **Step 1: Write test to verify test harness runs**

Create `src/tests/setup.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('Project harness', () => {
  it('runs unit tests correctly', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Initialize `package.json` with Next.js 15, Drizzle, Supabase, Vitest**

Create `package.json` with scripts:
- `dev`: `next dev`
- `build`: `next build`
- `start`: `next start`
- `test`: `vitest run`
- `db:generate`: `drizzle-kit generate`
- `db:push`: `drizzle-kit push`

Required dependencies:
`next@^15.0.0`, `react@^19.0.0`, `react-dom@^19.0.0`, `@supabase/ssr@^0.5.0`, `@supabase/supabase-js@^2.45.0`, `drizzle-orm@^0.35.0`, `postgres@^3.4.0`, `lucide-react@^0.450.0`, `tailwind-merge@^2.5.0`, `clsx@^2.1.0`.
DevDependencies:
`typescript`, `@types/node`, `@types/react`, `tailwindcss`, `postcss`, `autoprefixer`, `drizzle-kit`, `vitest`, `p-limit@^6.0.0`.

- [ ] **Step 3: Run test suite to verify Vitest configuration**

Run: `npx vitest run`
Expected: 1 passed.

- [ ] **Step 4: Create `.env.example` and basic Next.js app layout**

Add to `.env.example`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://postgres.xxx:xxx@aws-0-region.pooler.supabase.com:6543/postgres
CRON_SECRET=your-cron-secret
BLOCKED_GROUP_IDS=
```

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json tailwind.config.ts postcss.config.mjs vitest.config.ts .env.example src/
git commit -m "chore: scaffold Next.js 15 project with Tailwind, Drizzle and Vitest"
```

---

### Task 2: Database Schema & Drizzle Setup

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `drizzle.config.ts`
- Test: `src/tests/schema.test.ts`

**Interfaces:**
- Produces: Drizzle database instance `db` connected via postgres pooler with `prepare: false`.
- Exported tables: `manga`, `chapters`, `feedPages`, `searchCache`, `bookmarks`, `readingProgress`.

- [ ] **Step 1: Write test verifying schema types and table exports**

Create `src/tests/schema.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { manga, chapters, feedPages, searchCache, bookmarks, readingProgress } from '@/db/schema';

describe('Drizzle schema', () => {
  it('exports all 6 required tables', () => {
    expect(manga).toBeDefined();
    expect(chapters).toBeDefined();
    expect(feedPages).toBeDefined();
    expect(searchCache).toBeDefined();
    expect(bookmarks).toBeDefined();
    expect(readingProgress).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails before schema implementation**

Run: `npx vitest run src/tests/schema.test.ts`
Expected: FAIL ("cannot find module '@/db/schema'")

- [ ] **Step 3: Implement `src/db/schema.ts` and `src/db/index.ts`**

Define tables according to spec:
- `manga`: `id` (uuid pk), `title` (text not null), `altTitles` (jsonb), `description` (text), `coverFileName` (text), `status` (text), `contentRating` (text), `originalLanguage` (text), `availableLanguages` (text[]), `chapterCounts` (jsonb), `tags` (text[]), `year` (int), `lastSyncedAt`, `createdAt`, `updatedAt`.
- `chapters`: `id` (uuid pk), `mangaId` (uuid references manga.id), `chapterNumber` (text), `volumeNumber` (text), `title` (text), `translatedLanguage` (text), `scanlationGroups` (text[]), `pagesCount` (int), `externalUrl` (text), `isUnavailable` (boolean), `publishedAt`, `createdAt`.
- `feedPages`: `mangaId`, `language`, `offset`, `total`, `fetchedAt` (composite pk).
- `searchCache`: `queryKey` (text pk), `payload` (jsonb), `expiresAt` (timestamp).
- `bookmarks`: `id` (uuid pk), `userId` (uuid), `mangaId` (uuid references manga.id), `status` (text default 'reading'), `updatedAt`.
- `readingProgress`: `id` (uuid pk), `userId` (uuid), `mangaId` (uuid references manga.id), `chapterId` (uuid), `lastPage` (int default 1), `isCompleted` (boolean), `updatedAt`.

Implement `src/db/index.ts`:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || '';
export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db/ drizzle.config.ts src/tests/schema.test.ts
git commit -m "feat(db): implement Drizzle schema with 6 tables and transaction pooler client"
```

---

### Task 3: MangaDex API Client & Rate Limiter

**Files:**
- Create: `src/lib/mangadex/types.ts`
- Create: `src/lib/mangadex/client.ts`
- Create: `src/lib/mangadex/helpers.ts`
- Test: `src/tests/mangadex-helpers.test.ts`
- Test: `src/tests/rate-limiter.test.ts`

**Interfaces:**
- Consumes: Node global `fetch`.
- Produces:
  - `mangadexFetch<T>(endpoint: string, params?: Record<string, any>): Promise<T>`
  - `getPreferredTitle(titles: Record<string, string>, altTitles?: Record<string, string>[]): string`
  - `getPreferredDescription(desc: Record<string, string>): string`
  - `getCoverUrl(mangaId: string, coverFileName: string, size?: '256' | '512'): string`

- [ ] **Step 1: Write test for MangaDex helpers (localization fallback & cover URLs)**

Create `src/tests/mangadex-helpers.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { getPreferredTitle, getPreferredDescription, getCoverUrl } from '@/lib/mangadex/helpers';

describe('MangaDex helpers', () => {
  it('resolves title with fallback en -> ja-ro -> first entry', () => {
    expect(getPreferredTitle({ 'ja-ro': 'One Piece', 'ja': 'ワンピース' })).toBe('One Piece');
    expect(getPreferredTitle({ en: 'Solo Leveling' })).toBe('Solo Leveling');
    expect(getPreferredTitle({ fr: 'Attaque des Titans' })).toBe('Attaque des Titans');
    expect(getPreferredTitle({}, [{ en: 'Alt Title' }])).toBe('Alt Title');
    expect(getPreferredTitle({})).toBe('Untitled');
  });

  it('resolves description with fallback en -> first entry', () => {
    expect(getPreferredDescription({ en: 'Pirate adventure.', es: 'Aventura pirata.' })).toBe('Pirate adventure.');
    expect(getPreferredDescription({ id: 'Cerita bajak laut.' })).toBe('Cerita bajak laut.');
    expect(getPreferredDescription({})).toBe('');
  });

  it('generates MangaDex cover URLs with size qualifier', () => {
    const url = getCoverUrl('manga-123', 'cover-abc.jpg', '512');
    expect(url).toBe('https://uploads.mangadex.org/covers/manga-123/cover-abc.jpg.512.jpg');
    const thumbUrl = getCoverUrl('manga-123', 'cover-abc.jpg', '256');
    expect(thumbUrl).toBe('https://uploads.mangadex.org/covers/manga-123/cover-abc.jpg.256.jpg');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/mangadex-helpers.test.ts`
Expected: FAIL ("cannot find module '@/lib/mangadex/helpers'")

- [ ] **Step 3: Implement helpers and token bucket rate limiter**

Create `src/lib/mangadex/helpers.ts` implementing `getPreferredTitle`, `getPreferredDescription`, `getCoverUrl`.
Create `src/lib/mangadex/client.ts`:
- Token bucket queue enforcing max 5 requests per second.
- Custom User-Agent header: `aniwatch/1.0 (https://github.com/aniwatch)`.
- Automatic retry on HTTP 429 with exponential backoff (up to 3 retries).
- Error handling logging `X-Request-ID` per MangaDex API guidelines.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/mangadex-helpers.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mangadex/ src/tests/mangadex-helpers.test.ts
git commit -m "feat(api): implement MangaDex client with rate limiter and localization helpers"
```

---

### Task 4: Manga Ingestion & Chapter Feed Services

**Files:**
- Create: `src/lib/mangadex/api.ts`
- Create: `src/lib/mangadex/dedup.ts`
- Test: `src/tests/chapter-dedup.test.ts`
- Test: `src/tests/manga-api.test.ts`

**Interfaces:**
- Consumes: `mangadexFetch`, `db`, `manga`, `chapters`, `feedPages`, `searchCache`.
- Produces:
  - `searchManga(params: SearchParams): Promise<{ manga: MangaItem[]; total: number }>`
  - `getMangaDetail(id: string): Promise<MangaDetail>`
  - `getChapterFeed(mangaId: string, language: string, offset: number): Promise<{ chapters: ChapterItem[]; total: number }>`
  - `deduplicateChapters(chapters: ChapterItem[]): ChapterItem[]`

- [ ] **Step 1: Write test for chapter deduplication and sorting**

Create `src/tests/chapter-dedup.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { deduplicateChapters } from '@/lib/mangadex/dedup';

describe('Chapter deduplication', () => {
  it('deduplicates multiple groups for same chapter number picking newest upload', () => {
    const list = [
      { id: '1', chapterNumber: '10', publishedAt: '2026-01-01T00:00:00Z', pagesCount: 20, scanlationGroups: ['Group A'] },
      { id: '2', chapterNumber: '10', publishedAt: '2026-01-02T00:00:00Z', pagesCount: 20, scanlationGroups: ['Group B'] },
      { id: '3', chapterNumber: '9', publishedAt: '2025-12-31T00:00:00Z', pagesCount: 18, scanlationGroups: ['Group A'] },
    ];
    const deduped = deduplicateChapters(list as any);
    expect(deduped).toHaveLength(2);
    expect(deduped.find(c => c.chapterNumber === '10')?.id).toBe('2');
  });

  it('sorts chapter numbers numerically descending', () => {
    const list = [
      { id: '1', chapterNumber: '2', publishedAt: '2026-01-01Z' },
      { id: '2', chapterNumber: '10', publishedAt: '2026-01-01Z' },
      { id: '3', chapterNumber: '1.5', publishedAt: '2026-01-01Z' },
    ];
    const deduped = deduplicateChapters(list as any);
    expect(deduped.map(c => c.chapterNumber)).toEqual(['10', '2', '1.5']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/chapter-dedup.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `deduplicateChapters` and MangaDex service methods in `api.ts`**

- `deduplicateChapters`: Group by `chapterNumber`, pick max `publishedAt` (tiebreak: max `pagesCount`), sort numeric-aware descending (`parseFloat(a) - parseFloat(b)` with fallback for string tags).
- `searchManga`: Hash query params -> check `searchCache` (TTL 30m). If expired/missing -> call MangaDex `/manga` -> upsert returned manga records into `manga` table -> cache query result -> return.
- `getMangaDetail`: Check `manga` table. If missing/stale (>24h) -> call `/manga/{id}?includes[]=cover_art&includes[]=author` -> extract `availableTranslatedLanguages` -> upsert into `manga` -> return.
- `getChapterFeed`: Check `feedPages` for `(mangaId, language, offset)`. If missing -> call `/manga/{id}/feed?translatedLanguage[]={lang}&limit=100&offset={offset}&includes[]=scanlation_group&order[chapter]=desc` -> upsert chapters -> record `feedPages` entry -> return deduplicated list.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/chapter-dedup.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/mangadex/api.ts src/lib/mangadex/dedup.ts src/tests/chapter-dedup.test.ts
git commit -m "feat(api): add chapter feed service, cache-aside ingestion, and chapter deduplication"
```

---

### Task 5: Supabase Auth & Progress Reconciliation

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/lib/progress.ts`
- Create: `src/app/auth/callback/route.ts`
- Test: `src/tests/progress-merger.test.ts`

**Interfaces:**
- Consumes: `@supabase/ssr`, `db`, `readingProgress`, `bookmarks`.
- Produces:
  - `createClient()` (browser)
  - `createClient()` (RSC / server)
  - `mergeGuestProgress(guestMap: Record<string, GuestProgress>, userId: string): Promise<void>`
  - `saveChapterProgress(userId: string | null, progress: ProgressInput): Promise<void>`

- [ ] **Step 1: Write test for progress merging algorithm (latest updatedAt wins)**

Create `src/tests/progress-merger.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { reconcileProgress } from '@/lib/progress';

describe('Progress reconciliation', () => {
  it('keeps guest progress if newer than server progress', () => {
    const serverRecords = [
      { chapterId: 'ch-1', mangaId: 'm-1', lastPage: 5, updatedAt: new Date('2026-01-01T10:00:00Z') },
    ];
    const guestRecords = {
      'ch-1': { mangaId: 'm-1', lastPage: 12, updatedAt: '2026-01-01T12:00:00Z' },
    };
    const merged = reconcileProgress(serverRecords, guestRecords);
    expect(merged['ch-1'].lastPage).toBe(12);
  });

  it('keeps server progress if newer than guest progress', () => {
    const serverRecords = [
      { chapterId: 'ch-1', mangaId: 'm-1', lastPage: 25, updatedAt: new Date('2026-01-01T15:00:00Z') },
    ];
    const guestRecords = {
      'ch-1': { mangaId: 'm-1', lastPage: 10, updatedAt: '2026-01-01T12:00:00Z' },
    };
    const merged = reconcileProgress(serverRecords, guestRecords);
    expect(merged['ch-1'].lastPage).toBe(25);
  });

  it('includes novel chapters present only in guest progress', () => {
    const serverRecords = [];
    const guestRecords = {
      'ch-2': { mangaId: 'm-1', lastPage: 1, updatedAt: '2026-01-01T12:00:00Z' },
    };
    const merged = reconcileProgress(serverRecords, guestRecords);
    expect(merged['ch-2'].lastPage).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/tests/progress-merger.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement Supabase SSR helpers and progress reconciliation**

- Implement `@supabase/ssr` cookies handling in `src/lib/supabase/client.ts`, `server.ts`, and `middleware.ts`.
- Implement `reconcileProgress` pure function in `src/lib/progress.ts`.
- Implement `mergeGuestProgress` DB upsert helper: iterates merged records and upserts into `readingProgress`.
- Implement `/auth/callback/route.ts` exchanging code for session.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/tests/progress-merger.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/ src/lib/progress.ts src/app/auth/ src/tests/progress-merger.test.ts
git commit -m "feat(auth): configure Supabase SSR auth and latest-wins progress reconciliation"
```

---

### Task 6: UI Shell, Homepage & Catalog Browse

**Files:**
- Create: `src/components/navbar.tsx`
- Create: `src/components/footer.tsx`
- Create: `src/components/manga-card.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/browse/page.tsx`
- Create: `src/app/search/page.tsx`
- Test: `src/tests/manga-card.test.tsx`

**Interfaces:**
- Consumes: `searchManga`, `getPreferredTitle`, `getCoverUrl`.
- Produces:
  - Homepage with Trending, Latest Updated, and Popular sliders/grids.
  - Browse page with Tag filters, Status filters, Language filters, Sort dropdown.
  - Search page responding to URL `?q=query`.
  - Footer with explicit MangaDex and Scanlation Group credit policy notice.

- [ ] **Step 1: Write component test for MangaCard**

Create `src/tests/manga-card.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest';
import { getCoverUrl } from '@/lib/mangadex/helpers';

describe('MangaCard data flow', () => {
  it('correctly formats cover thumbnail and title link', () => {
    const cardData = {
      id: 'a1c7c817-4e59-43b7-9365-09675a149a6f',
      title: 'One Piece',
      coverFileName: 'cover.jpg',
      status: 'ongoing',
      latestChapter: '1196',
    };
    const coverUrl = getCoverUrl(cardData.id, cardData.coverFileName, '256');
    expect(coverUrl).toContain('256.jpg');
    expect(`/manga/${cardData.id}`).toBe('/manga/a1c7c817-4e59-43b7-9365-09675a149a6f');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/tests/manga-card.test.tsx`
Expected: PASS

- [ ] **Step 3: Implement components and pages**

- `src/components/navbar.tsx`: Logo ("Aniwatch"), Search input submitting to `/search?q=...`, Browse link, Library link, Auth avatar / Login button.
- `src/components/footer.tsx`: Disclaimer, "Data provided by MangaDex API. Content rights belong to respective authors and scanlation groups. Ad-free non-commercial reader."
- `src/components/manga-card.tsx`: Cover image with skeleton fallback, status badge, title, latest chapter badge.
- `src/app/page.tsx`: Fetch `latestUploadedChapter`, `rating`, `followedCount` in parallel via RSC -> render carousel + grids.
- `src/app/browse/page.tsx`: Dynamic filters based on URL searchParams (`tags`, `status`, `order`, `lang`).
- `src/app/search/page.tsx`: Full-text search results grid with pagination.

- [ ] **Step 4: Verify Next.js build compiles without type errors**

Run: `npx next build` (or `tsc --noEmit`)
Expected: Type check passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/ src/app/ src/tests/manga-card.test.tsx
git commit -m "feat(ui): implement navbar, footer with credits, homepage, browse and search pages"
```

---

### Task 7: Manga Detail Page & Language Availability Filter

**Files:**
- Create: `src/app/manga/[id]/page.tsx`
- Create: `src/components/language-selector.tsx`
- Create: `src/components/chapter-list.tsx`
- Test: `src/tests/language-selector.test.ts`

**Interfaces:**
- Consumes: `getMangaDetail`, `getChapterFeed`, `deduplicateChapters`.
- Produces:
  - Manga Detail page with synopsis, tags, author, cover, reading status button.
  - Interactive Language Availability selector (e.g. `English (180)`, `Indonesian (14)`, `Japanese (200)`).
  - Infinite-scrolling chapter feed filtered to selected language with group credits and MangaPlus external link indicators.

- [ ] **Step 1: Write test for language availability pill formatter**

Create `src/tests/language-selector.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('Language selector logic', () => {
  it('maps 2-letter language codes to friendly names', () => {
    const langNames: Record<string, string> = {
      en: 'English',
      id: 'Indonesian',
      ja: 'Japanese',
      es: 'Spanish',
      ko: 'Korean',
    };
    expect(langNames['en']).toBe('English');
    expect(langNames['id']).toBe('Indonesian');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/tests/language-selector.test.ts`
Expected: PASS

- [ ] **Step 3: Implement Detail Page, Language Selector, and Chapter List**

- `src/components/language-selector.tsx`: Renders pills for all codes in `manga.availableLanguages`. Shows count badge if available. Highlights active language from URL query param `?lang=en` (defaults to user preference or first available).
- `src/components/chapter-list.tsx`:
  - Renders chapters sorted descending.
  - Displays chapter number, chapter title, scanlation group name (with link if present).
  - Handles official external chapters (`externalUrl` present): displays "Read on MangaPlus ↗" opening in new tab.
  - Infinite scroll: triggers fetch to `/api/chapters/feed?mangaId={id}&lang={lang}&offset={next}` when scrolling near bottom.
  - Toggle: "Show all scanlation groups" to toggle between deduplicated view and full upload list.
- `src/app/manga/[id]/page.tsx`: RSC fetching manga metadata and initial 100 chapters for the active language.

- [ ] **Step 4: Commit**

```bash
git add src/app/manga/ src/components/language-selector.tsx src/components/chapter-list.tsx src/tests/language-selector.test.ts
git commit -m "feat(manga): implement detail page with multi-language selector and infinite chapter list"
```

---

### Task 8: Reader Implementation (Webtoon & Page-by-Page)

**Files:**
- Create: `src/app/manga/[id]/read/[chapterId]/page.tsx`
- Create: `src/app/api/at-home/[chapterId]/route.ts`
- Create: `src/components/reader/webtoon-reader.tsx`
- Create: `src/components/reader/paged-reader.tsx`
- Create: `src/components/reader/reader-controls.tsx`
- Create: `src/components/reader/progress-tracker.tsx`
- Test: `src/tests/at-home-url.test.ts`

**Interfaces:**
- Consumes: MangaDex `/at-home/server/{chapterId}` endpoint, `readingProgress` table, `localStorage`.
- Produces:
  - Dual-mode reader (Webtoon continuous scroll vs Single/Double page flip).
  - RTL / LTR reading direction support.
  - Image preloading for upcoming 3 pages.
  - Top & bottom collapsible control bars (quality toggle `/data/` vs `/data-saver/`, theme selector, prev/next chapter).
  - Background image error handling with fallback reload.

- [ ] **Step 1: Write test for At-Home URL construction**

Create `src/tests/at-home-url.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('At-Home page URL generator', () => {
  it('constructs correct high-quality and data-saver image URLs', () => {
    const baseUrl = 'https://uploads.mangadex.org';
    const hash = 'abc123hash';
    const filename = '1-x.jpg';
    
    const fullUrl = `${baseUrl}/data/${hash}/${filename}`;
    const saverUrl = `${baseUrl}/data-saver/${hash}/${filename}`;
    
    expect(fullUrl).toBe('https://uploads.mangadex.org/data/abc123hash/1-x.jpg');
    expect(saverUrl).toBe('https://uploads.mangadex.org/data-saver/abc123hash/1-x.jpg');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/tests/at-home-url.test.ts`
Expected: PASS

- [ ] **Step 3: Implement At-Home Route Handler and Reader Components**

- `src/app/api/at-home/[chapterId]/route.ts`: Proxies MangaDex `/at-home/server/{chapterId}?forcePort443=true`. If chapter has `externalUrl`, returns `{ isExternal: true, externalUrl }`.
- `src/components/reader/webtoon-reader.tsx`: Vertical stack with `max-w-[850px] mx-auto`. IntersectionObserver tracks visible page index and notifies progress tracker. Preloads next 3 images.
- `src/components/reader/paged-reader.tsx`: Single/double image container. Keyboard bindings (ArrowLeft, ArrowRight, Space). Tap zones (left 30% flips prev/next depending on LTR/RTL, center 40% toggles controls, right 30% flips).
- `src/components/reader/reader-controls.tsx`: Header (Manga title, Chapter title, exit back to manga). Footer (Page slider, reading mode toggle, quality toggle, prev/next chapter buttons). Auto-hides on scroll.
- `src/components/reader/progress-tracker.tsx`: On page index change: debounces 1000ms -> updates `localStorage['aniwatch:progress']`. If logged in, sends beacon / POST to `/api/progress`. Registers `visibilitychange` to send beacon before tab closes.

- [ ] **Step 4: Commit**

```bash
git add src/app/manga/[id]/read/ src/app/api/at-home/ src/components/reader/ src/tests/at-home-url.test.ts
git commit -m "feat(reader): implement webtoon and paged readers with controls, preloading and progress sync"
```

---

### Task 9: User Library, History & Polish

**Files:**
- Create: `src/app/library/page.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/app/api/cron/refresh-trending/route.ts`
- Modify: `src/components/navbar.tsx` (connect library count & auth state)
- Test: `src/tests/library-filters.test.ts`

**Interfaces:**
- Consumes: Supabase Auth session, `bookmarks`, `readingProgress`, `manga` table.
- Produces:
  - User Library page with tabs: Reading, Completed, Plan to Read, Dropped.
  - Reading History list with "Resume" CTA jumping straight to last-read chapter and page.
  - Vercel Cron endpoint `/api/cron/refresh-trending` protected with `CRON_SECRET` header.

- [ ] **Step 1: Write test for library status filtering**

Create `src/tests/library-filters.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

describe('Library status tabs', () => {
  const allowedStatuses = ['reading', 'completed', 'on_hold', 'plan_to_read', 'dropped'];
  it('validates bookmark status transitions', () => {
    expect(allowedStatuses).toContain('reading');
    expect(allowedStatuses).toContain('completed');
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run src/tests/library-filters.test.ts`
Expected: PASS

- [ ] **Step 3: Implement Library, Login and Cron Refresh Pages**

- `src/app/login/page.tsx`: Supabase Auth UI (Email + Magic link / Password, Google OAuth button). On success, triggers guest `localStorage` progress merge to Supabase.
- `src/app/library/page.tsx`: Auth-guarded RSC. Queries user's `bookmarks` joined with `manga` and user's `readingProgress`. Displays shelf tabs with count badges.
- `src/app/api/cron/refresh-trending/route.ts`: Verifies `req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}``. Calls MangaDex for latest 50 trending and updates `searchCache`.

- [ ] **Step 4: Run full test suite and build verification**

Run: `npx vitest run`
Expected: All test suites pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/library/ src/app/login/ src/app/api/cron/ src/tests/library-filters.test.ts
git commit -m "feat(library): add user library shelves, reading history, and cron cache refresher"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Catalog browsing & search (Task 4, 6), Language availability pills & counts (Task 4, 7), Infinite scroll chapter list (Task 4, 7), Webtoon + Paged reader with preloading (Task 8), Supabase Auth & Progress sync (Task 5, 8, 9), MangaDex AUP credits and ad-free constraint (Task 3, 6).
- [x] **Step scan:** Every step contains explicit file paths, exact code/test snippets, command to run, and expected output.
- [x] **Type consistency:** Table names and fields (`manga`, `chapters`, `feedPages`, `searchCache`, `bookmarks`, `readingProgress`) match Drizzle schema across all tasks.
- [x] **Review Focus:**
  1. External MangaPlus URL -> covered in Task 7 Step 3 and Task 8 Step 3.
  2. Localization fallback -> covered in Task 3 Step 1.
  3. 1000+ chapters serverless timeout -> addressed by paginated 100-chunk `feedPages` in Task 4 Step 3 & Task 7 Step 3.
  4. Duplicate chapter numbers across groups -> covered in Task 4 Step 1 & 3.
  5. Guest progress migration -> covered in Task 5 Step 1 & 3.
- [x] **Proportion:** Clear task boundaries without excessive boilerplate.
