import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { bookmarks, manga, readingProgress } from '@/db/schema';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { createClient } from '@/lib/supabase/server';

const SHELVES = [
  { key: 'reading', label: 'Reading', kanji: '読書中' },
  { key: 'completed', label: 'Completed', kanji: '読了' },
  { key: 'on_hold', label: 'On Hold', kanji: '保留' },
  { key: 'plan_to_read', label: 'Plan to Read', kanji: '積読' },
  { key: 'dropped', label: 'Dropped', kanji: '中断' },
];

export const dynamic = 'force-dynamic';

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const sp = await searchParams;
  const shelf = (sp.shelf as string) || 'reading';

  const shelfRows = await db
    .select()
    .from(bookmarks)
    .where(eq(bookmarks.userId, user.id));

  const mangaIds = shelfRows.map((b) => b.mangaId);
  const mangaRows = mangaIds.length
    ? await db.select().from(manga).where(inArray(manga.id, mangaIds))
    : [];

  const mangaMap = new Map(mangaRows.map((m) => [m.id, m]));

  const progressRows = await db
    .select()
    .from(readingProgress)
    .where(eq(readingProgress.userId, user.id));

  const progressByManga = new Map<string, (typeof progressRows)[number]>();
  for (const p of progressRows) {
    const existing = progressByManga.get(p.mangaId);
    if (!existing || p.updatedAt > existing.updatedAt) {
      progressByManga.set(p.mangaId, p);
    }
  }

  const shelfItems = shelfRows
    .filter((b) => b.status === shelf)
    .map((b) => ({
      bookmark: b,
      manga: mangaMap.get(b.mangaId),
      progress: progressByManga.get(b.mangaId),
    }))
    .filter((item) => item.manga);

  const counts = SHELVES.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = shelfRows.filter((b) => b.status === s.key).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar libraryCount={shelfRows.length} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Masthead */}
        <div className="mb-6 border-b-2 border-ink pb-3">
          <p className="font-meta text-[11px] uppercase tracking-widest text-vermilion mb-1">
            Personal Archive
          </p>
          <h1 className="font-display font-black text-3xl sm:text-4xl tracking-masthead text-ink">
            MY SHELF{' '}
            <span className="font-editorial italic font-normal text-muted text-2xl">
              (本棚)
            </span>
          </h1>
        </div>

        {/* Shelf Tabs */}
        <div className="flex flex-wrap border border-hairline divide-x divide-hairline mb-6 font-meta text-xs">
          {SHELVES.map((s) => (
            <Link
              key={s.key}
              href={`/library?shelf=${s.key}`}
              className={`px-4 py-2 font-bold transition ${
                shelf === s.key
                  ? 'bg-vermilion text-white'
                  : 'text-zinc-300 hover:bg-zinc-900 hover:text-ink'
              }`}
            >
              {s.label}
              <span
                className={`ml-1.5 ${
                  shelf === s.key ? 'text-white/80' : 'text-vermilion'
                }`}
              >
                ({counts[s.key]})
              </span>
            </Link>
          ))}
        </div>

        {/* Shelf Contents */}
        {shelfItems.length > 0 ? (
          <div className="space-y-2">
            {shelfItems.map(({ bookmark, manga: m, progress }) => (
              <div
                key={bookmark.id}
                className="border border-hairline bg-zinc-950 flex items-stretch"
              >
                {/* Cover Thumb */}
                <Link
                  href={`/manga/${m!.id}`}
                  className="w-16 shrink-0 border-r border-hairline overflow-hidden hidden sm:block"
                >
                  {m!.coverFileName ? (
                    <img
                      src={`https://uploads.mangadex.org/covers/${m!.id}/${m!.coverFileName}.256.jpg`}
                      alt={m!.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted text-[10px] font-meta">
                      —
                    </div>
                  )}
                </Link>

                {/* Metadata */}
                <div className="flex-1 p-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/manga/${m!.id}`}
                      className="font-editorial text-base font-semibold text-ink hover:text-vermilion transition line-clamp-1"
                    >
                      {m!.title}
                    </Link>
                    <p className="font-meta text-[11px] text-muted mt-0.5">
                      {m!.status?.toUpperCase() || '—'}
                      {m!.year ? ` • ${m!.year}` : ''}
                      {progress && ` • PAGE ${progress.lastPage}`}
                    </p>
                  </div>

                  {progress && (
                    <Link
                      href={`/manga/${m!.id}/read/${progress.chapterId}`}
                      className="px-4 py-1.5 bg-vermilion hover:bg-vermilion-dark text-white font-meta font-bold text-[11px] uppercase transition shrink-0"
                    >
                      Resume →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-hairline py-16 text-center">
            <p className="font-meta text-sm text-muted">
              Nothing on this shelf yet.
            </p>
            <Link
              href="/browse"
              className="inline-block mt-4 font-meta text-xs text-vermilion hover:underline"
            >
              Browse the catalog →
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
