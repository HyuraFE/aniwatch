import { NextResponse, type NextRequest } from 'next/server';
import { searchManga } from '@/lib/mangadex/api';

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Warming the trending + latest caches ahead of user traffic
    const [trending, latest] = await Promise.all([
      searchManga({ order: { followedCount: 'desc' }, limit: 24 }),
      searchManga({
        order: { latestUploadedChapter: 'desc' },
        limit: 24,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      warmed: { trending: trending.items.length, latest: latest.items.length },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Refresh failed' },
      { status: 500 }
    );
  }
}
