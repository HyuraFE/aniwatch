import { NextResponse, type NextRequest } from 'next/server';
import { getChapterFeed } from '@/lib/mangadex/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mangaId = searchParams.get('mangaId');
  const lang = searchParams.get('lang') || 'en';
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const showAll = searchParams.get('showAll') === 'true';

  if (!mangaId) {
    return NextResponse.json(
      { error: 'mangaId is required' },
      { status: 400 }
    );
  }

  try {
    const feed = await getChapterFeed(mangaId, lang, offset, showAll);
    return NextResponse.json(feed);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch chapter feed' },
      { status: 500 }
    );
  }
}
