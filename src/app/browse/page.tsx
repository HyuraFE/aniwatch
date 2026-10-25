import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { MangaCard } from '@/components/manga-card';
import { searchManga } from '@/lib/mangadex/api';

export const revalidate = 1800;

const SORT_OPTIONS = [
  { key: 'latestUploadedChapter', label: 'Latest Update' },
  { key: 'followedCount', label: 'Most Followed' },
  { key: 'rating', label: 'Highest Rated' },
  { key: 'createdAt', label: 'Newest Added' },
];

const STATUS_OPTIONS = [
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
  { key: 'hiatus', label: 'Hiatus' },
  { key: 'cancelled', label: 'Cancelled' },
];

const LANGUAGE_OPTIONS = [
  { key: 'en', label: 'English' },
  { key: 'ja', label: 'Japanese' },
  { key: 'id', label: 'Indonesian' },
  { key: 'es', label: 'Spanish' },
  { key: 'fr', label: 'French' },
  { key: 'pt-br', label: 'Portuguese (BR)' },
  { key: 'ko', label: 'Korean' },
];

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const order = (params.order as string) || 'latestUploadedChapter';
  const status = params.status as string | undefined;
  const lang = params.lang as string | undefined;
  const page = parseInt((params.page as string) || '1', 10);
  const perPage = 24;
  const offset = (page - 1) * perPage;

  const result = await searchManga({
    order: { [order]: 'desc' },
    status: status ? [status] : undefined,
    availableTranslatedLanguage: lang ? [lang] : undefined,
    limit: perPage,
    offset,
  }).catch(() => ({ items: [], total: 0 }));

  const totalPages = Math.ceil(result.total / perPage);

  const buildHref = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      order,
      status,
      lang,
      page: String(page),
      ...updates,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) next.set(k, v);
    }
    return `/browse?${next.toString()}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Page Title */}
        <div className="mb-6 border-b-2 border-ink pb-3">
          <p className="font-meta text-[11px] uppercase tracking-widest text-vermilion mb-1">
            Catalog Index
          </p>
          <h1 className="font-display font-black text-3xl sm:text-4xl tracking-masthead text-ink">
            BROWSE{' '}
            <span className="font-editorial italic font-normal text-muted text-2xl">
              (全作品)
            </span>
          </h1>
        </div>

        {/* Filter Registry */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Filters */}
          <aside className="lg:col-span-3 space-y-5">
            {/* Sort */}
            <div className="border border-hairline">
              <div className="px-3 py-2 border-b border-hairline font-meta text-[11px] uppercase tracking-wider font-bold text-zinc-300">
                Order By
              </div>
              <div className="divide-y divide-hairline">
                {SORT_OPTIONS.map((opt) => (
                  <Link
                    key={opt.key}
                    href={buildHref({ order: opt.key, page: '1' })}
                    className={`block px-3 py-2 font-meta text-xs transition ${
                      order === opt.key
                        ? 'bg-vermilion/10 text-vermilion font-bold'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-ink'
                    }`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="border border-hairline">
              <div className="px-3 py-2 border-b border-hairline font-meta text-[11px] uppercase tracking-wider font-bold text-zinc-300">
                Status
              </div>
              <div className="divide-y divide-hairline">
                <Link
                  href={buildHref({ status: undefined, page: '1' })}
                  className={`block px-3 py-2 font-meta text-xs transition ${
                    !status
                      ? 'bg-vermilion/10 text-vermilion font-bold'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-ink'
                  }`}
                >
                  All
                </Link>
                {STATUS_OPTIONS.map((opt) => (
                  <Link
                    key={opt.key}
                    href={buildHref({ status: opt.key, page: '1' })}
                    className={`block px-3 py-2 font-meta text-xs transition ${
                      status === opt.key
                        ? 'bg-vermilion/10 text-vermilion font-bold'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-ink'
                    }`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="border border-hairline">
              <div className="px-3 py-2 border-b border-hairline font-meta text-[11px] uppercase tracking-wider font-bold text-zinc-300">
                Available In
              </div>
              <div className="divide-y divide-hairline">
                <Link
                  href={buildHref({ lang: undefined, page: '1' })}
                  className={`block px-3 py-2 font-meta text-xs transition ${
                    !lang
                      ? 'bg-vermilion/10 text-vermilion font-bold'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-ink'
                  }`}
                >
                  Any Language
                </Link>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <Link
                    key={opt.key}
                    href={buildHref({ lang: opt.key, page: '1' })}
                    className={`block px-3 py-2 font-meta text-xs transition ${
                      lang === opt.key
                        ? 'bg-vermilion/10 text-vermilion font-bold'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-ink'
                    }`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* Results Grid */}
          <section className="lg:col-span-9">
            <div className="flex justify-between items-baseline mb-4 pb-2 border-b border-hairline">
              <span className="font-meta text-xs text-muted">
                {result.total.toLocaleString()} TITLES FOUND
              </span>
              <span className="font-meta text-xs text-muted">
                PAGE {page} / {Math.max(totalPages, 1)}
              </span>
            </div>

            {result.items.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
                {result.items.map((item) => (
                  <MangaCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="border border-hairline py-16 text-center">
                <p className="font-meta text-sm text-muted">
                  No titles matched these filters.
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                {page > 1 && (
                  <Link
                    href={buildHref({ page: String(page - 1) })}
                    className="px-4 py-2 border border-hairline font-meta text-xs text-zinc-300 hover:border-vermilion hover:text-vermilion transition"
                  >
                    ← PREV
                  </Link>
                )}
                <span className="font-meta text-xs text-muted px-3">
                  {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={buildHref({ page: String(page + 1) })}
                    className="px-4 py-2 border border-hairline font-meta text-xs text-zinc-300 hover:border-vermilion hover:text-vermilion transition"
                  >
                    NEXT →
                  </Link>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
