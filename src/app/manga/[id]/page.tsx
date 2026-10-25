import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { LanguageSelector } from '@/components/language-selector';
import { ChapterList } from '@/components/chapter-list';
import {
  getMangaDetail,
  getChapterFeed,
  getLanguageChapterCount,
} from '@/lib/mangadex/api';

export const revalidate = 3600;

export default async function MangaDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  let detail: Awaited<ReturnType<typeof getMangaDetail>>;
  try {
    detail = await getMangaDetail(id);
  } catch {
    notFound();
  }

  const activeLanguage = (sp.lang as string) || detail.availableLanguages[0] || 'en';

  // Fetch chapter counts for each available language (parallel, max 12)
  const chapterCounts: Record<string, number> = {};
  await Promise.all(
    detail.availableLanguages.slice(0, 12).map(async (code) => {
      try {
        chapterCounts[code] = await getLanguageChapterCount(id, code);
      } catch {
        // Leave the count out rather than blocking the page.
      }
    })
  );

  const feed = await getChapterFeed(id, activeLanguage, 0).catch(() => ({
    chapters: [],
    total: 0,
  }));

  const description = detail.description || 'No synopsis available.';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full">
        {/* Editorial Spread */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10 border-b border-hairline">
          {/* Left: Cover Plate & Metadata */}
          <div className="lg:col-span-4 lg:border-r lg:border-hairline lg:pr-8">
            <div className="border-2 border-hairline p-2 bg-zinc-950 max-w-sm mx-auto lg:mx-0">
              {detail.coverUrl ? (
                <div className="aspect-[2/3] overflow-hidden relative">
                  <img
                    src={detail.coverUrl}
                    alt={detail.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[2/3] flex items-center justify-center text-muted font-meta text-xs">
                  NO COVER ART
                </div>
              )}
              <div className="mt-2 pt-2 border-t border-hairline flex justify-between font-meta text-[11px] text-muted">
                <span>SERIALIZED</span>
                <span className="text-ink font-bold">
                  {detail.year || '—'}
                </span>
              </div>
            </div>

            {/* Metadata Table */}
            <dl className="mt-6 border border-hairline divide-y divide-hairline font-meta text-xs">
              <div className="p-2.5 flex justify-between gap-4">
                <dt className="text-muted">STATUS</dt>
                <dd className="font-bold text-ink uppercase">
                  {detail.status || '—'}
                </dd>
              </div>
              <div className="p-2.5 flex justify-between gap-4">
                <dt className="text-muted">ORIGIN</dt>
                <dd className="font-bold text-ink uppercase">
                  {detail.originalLanguage || '—'}
                </dd>
              </div>
              <div className="p-2.5 flex justify-between gap-4">
                <dt className="text-muted">RATING</dt>
                <dd className="font-bold text-ink uppercase">
                  {detail.contentRating || '—'}
                </dd>
              </div>
              <div className="p-2.5 flex justify-between gap-4">
                <dt className="text-muted">TAGS</dt>
                <dd className="font-bold text-ink text-right">
                  {detail.tags.length > 0 ? detail.tags.join(', ') : '—'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Right: Title Block, Synopsis, Language Registry */}
          <div className="lg:col-span-8">
            <p className="font-meta text-xs text-muted mb-2">
              <span className="text-vermilion font-bold">#SERIES</span>
              {detail.year ? ` • ${detail.year}` : ''}
              {detail.originalLanguage
                ? ` • ${detail.originalLanguage.toUpperCase()}`
                : ''}
            </p>

            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-ink leading-none mb-3">
              {detail.title}
            </h1>

            {detail.altTitles && detail.altTitles.length > 0 && (
              <div className="font-kanji text-lg font-bold text-vermilion mb-5">
                {detail.altTitles
                  .slice(0, 3)
                  .map((alt: any) => {
                    const firstVal = Object.values(alt || {})[0];
                    return Array.isArray(firstVal) ? firstVal[0] : (firstVal as string) || '';
                  })
                  .filter(Boolean)
                  .join(' • ')}
              </div>
            )}

            <p className="font-editorial text-base text-zinc-300 leading-relaxed max-w-3xl mb-6">
              {description}
            </p>

            {/* Language Availability Registry */}
            <div className="mb-6">
              <LanguageSelector
                mangaId={id}
                availableLanguages={detail.availableLanguages}
                activeLanguage={activeLanguage}
                chapterCounts={chapterCounts}
              />
            </div>

            {/* Action Row */}
            <div className="flex flex-wrap items-center gap-3">
              {feed.chapters.length > 0 && !feed.chapters[0].externalUrl && (
                <Link
                  href={`/manga/${id}/read/${feed.chapters[0].id}`}
                  className="px-7 py-3 bg-vermilion hover:bg-vermilion-dark text-white font-meta font-bold text-sm uppercase tracking-wider transition"
                >
                  Read Chapter {feed.chapters[0].chapterNumber}
                </Link>
              )}
              <a
                href={`https://mangadex.org/title/${id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-meta text-xs text-muted hover:text-ink transition"
              >
                View on MangaDex ↗
              </a>
            </div>
          </div>
        </div>

        {/* Chapter Table of Contents */}
        <div className="mt-10">
          <ChapterList
            mangaId={id}
            language={activeLanguage}
            initialChapters={feed.chapters}
            initialTotal={feed.total}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
