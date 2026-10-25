import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { MangaCard } from '@/components/manga-card';
import { searchManga } from '@/lib/mangadex/api';

export const revalidate = 600;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = ((params.q as string) || '').trim();
  const page = parseInt((params.page as string) || '1', 10);
  const perPage = 24;
  const offset = (page - 1) * perPage;

  const result = q
    ? await searchManga({ title: q, limit: perPage, offset }).catch(() => ({
        items: [],
        total: 0,
      }))
    : { items: [], total: 0 };

  const totalPages = Math.ceil(result.total / perPage);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Search Masthead */}
        <div className="mb-6 border-b-2 border-ink pb-3">
          <p className="font-meta text-[11px] uppercase tracking-widest text-vermilion mb-1">
            Search Results
          </p>
          <h1 className="font-display font-black text-2xl sm:text-3xl tracking-masthead text-ink">
            {q ? (
              <>
                QUERY: <span className="text-vermilion">&ldquo;{q}&rdquo;</span>
              </>
            ) : (
              'ENTER A SEARCH QUERY'
            )}
          </h1>
        </div>

        {/* Results */}
        {q ? (
          <div>
            <div className="flex justify-between items-baseline mb-5 pb-2 border-b border-hairline font-meta text-xs text-muted">
              <span>{result.total.toLocaleString()} TITLES FOUND</span>
              <span>
                PAGE {page} OF {Math.max(totalPages, 1)}
              </span>
            </div>

            {result.items.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-7">
                {result.items.map((item) => (
                  <MangaCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="border border-hairline py-16 text-center">
                <p className="font-meta text-sm text-muted">
                  No manga found matching &ldquo;{q}&rdquo;.
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                {page > 1 && (
                  <Link
                    href={`/search?q=${encodeURIComponent(q)}&page=${page - 1}`}
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
                    href={`/search?q=${encodeURIComponent(q)}&page=${page + 1}`}
                    className="px-4 py-2 border border-hairline font-meta text-xs text-zinc-300 hover:border-vermilion hover:text-vermilion transition"
                  >
                    NEXT →
                  </Link>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="border border-hairline py-16 text-center">
            <p className="font-meta text-sm text-muted">
              Use the search bar above to look up titles or authors.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
