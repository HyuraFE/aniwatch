import { NextResponse, type NextRequest } from 'next/server';
import { mangadexFetch } from '@/lib/mangadex/client';
import type { MangaDexAtHomeResponse } from '@/lib/mangadex/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const { chapterId } = await params;

  try {
    const data = await mangadexFetch<MangaDexAtHomeResponse>(
      `/at-home/server/${chapterId}`,
      { forcePort443: 'true' }
    );

    if (!data.baseUrl || !data.chapter?.hash) {
      return NextResponse.json(
        { error: 'Chapter has no hosted pages' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      baseUrl: data.baseUrl,
      hash: data.chapter.hash,
      data: data.chapter.data,
      dataSaver: data.chapter.dataSaver,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to load chapter pages' },
      { status: 502 }
    );
  }
}
