import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { MangaCard } from '@/components/manga-card';
import { searchManga } from '@/lib/mangadex/api';

export const revalidate = 1800; // 30 minutes

export default async function HomePage() {
  const [latest, popular] = await Promise.all([
    searchManga({
      order: { latestUploadedChapter: 'desc' },
      limit: 12,
    }).catch(() => ({ items: [], total: 0 })),
    searchManga({ order: { followedCount: 'desc' }, limit: 12 }).catch(() => ({
      items: [],
      total: 0,
    })),
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Section Header */}
        <div className="flex justify-between items-baseline mb-5 border-b-2 border-ink pb-2.5">
          <h2 className="font-display font-black text-xl uppercase tracking-wider text-ink">
            Latest Updates{' '}
            <span className="font-editorial italic font-normal text-muted text-base">
              (最近更新)
            </span>
          </h2>
          <Link
            href="/browse?order=latestUploadedChapter"
            className="font-meta text-xs text-muted hover:text-vermilion transition"
          >
            View all →
          </Link>
        </div>

        {latest.items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-7">
            {latest.items.map((item) => (
              <MangaCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="border border-hairline py-16 text-center">
            <p className="font-meta text-sm text-muted">
              Catalog unavailable — MangaDex API unreachable.
            </p>
          </div>
        )}

        {/* Popular Section */}
        <div className="mt-14">
          <div className="flex justify-between items-baseline mb-5 border-b-2 border-ink pb-2.5">
            <h2 className="font-display font-black text-xl uppercase tracking-wider text-ink">
              Most Followed{' '}
              <span className="font-editorial italic font-normal text-muted text-base">
                (人気作品)
              </span>
            </h2>
            <Link
              href="/browse?order=followedCount"
              className="font-meta text-xs text-muted hover:text-vermilion transition"
            >
              View all →
            </Link>
          </div>

          {popular.items.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-7">
              {popular.items.map((item) => (
                <MangaCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="border border-hairline py-12 text-center">
              <p className="font-meta text-sm text-muted">
                Popular list unavailable.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
