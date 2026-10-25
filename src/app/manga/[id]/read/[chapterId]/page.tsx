import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { chapters, manga } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { mangadexFetch } from '@/lib/mangadex/client';
import type {
  MangaDexAtHomeResponse,
  MangaDexChapter,
} from '@/lib/mangadex/types';
import { ReaderShell } from './reader-shell';

export const dynamic = 'force-dynamic';

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const { id: mangaId, chapterId } = await params;

  // 1. Fetch chapter from DB or MangaDex
  let chapter = await db
    .select()
    .from(chapters)
    .where(eq(chapters.id, chapterId))
    .limit(1)
    .then((r) => r[0]);

  if (!chapter) {
    try {
      const res = await mangadexFetch<{ data: MangaDexChapter }>(
        `/chapter/${chapterId}`
      );
      chapter = {
        id: res.data.id,
        mangaId,
        chapterNumber: res.data.attributes.chapter || 'Extra',
        volumeNumber: res.data.attributes.volume,
        title: res.data.attributes.title,
        translatedLanguage: res.data.attributes.translatedLanguage,
        scanlationGroups: [],
        pagesCount: res.data.attributes.pages,
        externalUrl: res.data.attributes.externalUrl,
        isUnavailable: res.data.attributes.isUnavailable,
        publishedAt: res.data.attributes.publishAt
          ? new Date(res.data.attributes.publishAt)
          : null,
        createdAt: new Date(),
      };
    } catch {
      notFound();
    }
  }

  // Handle external MangaPlus chapter
  if (chapter.externalUrl) {
    redirect(chapter.externalUrl);
  }

  // 2. Fetch manga title for header
  const mangaRow = await db
    .select()
    .from(manga)
    .where(eq(manga.id, mangaId))
    .limit(1)
    .then((r) => r[0]);

  const mangaTitle = mangaRow?.title || 'Manga';
  const isJapanese = mangaRow?.originalLanguage === 'ja';

  // 3. Fetch At-Home server image filenames
  let atHome: MangaDexAtHomeResponse;
  try {
    atHome = await mangadexFetch<MangaDexAtHomeResponse>(
      `/at-home/server/${chapterId}`,
      { forcePort443: 'true' }
    );
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-paper font-meta text-center text-ink">
        <div className="border border-hairline p-8 max-w-md">
          <h1 className="font-display font-black text-xl text-vermilion mb-2">
            CHAPTER UNAVAILABLE
          </h1>
          <p className="text-xs text-muted leading-relaxed">
            MangaDex@Home server was unable to retrieve pages for this
            chapter. The scanlation upload may be temporarily offline or
            removed by the group.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ReaderShell
      mangaId={mangaId}
      mangaTitle={mangaTitle}
      chapterId={chapterId}
      chapterNumber={chapter.chapterNumber}
      baseUrl={atHome.baseUrl}
      hash={atHome.chapter.hash}
      fullPages={atHome.chapter.data}
      saverPages={atHome.chapter.dataSaver}
      initialDirection={isJapanese ? 'rtl' : 'ltr'}
    />
  );
}
