import { NextResponse, type NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { readingProgress } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: {
    mangaId?: string;
    chapterId?: string;
    lastPage?: number;
    isCompleted?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { mangaId, chapterId, lastPage, isCompleted } = body;

  if (!mangaId || !chapterId || typeof lastPage !== 'number') {
    return NextResponse.json(
      { error: 'mangaId, chapterId and lastPage are required' },
      { status: 400 }
    );
  }

  try {
    await db
      .insert(readingProgress)
      .values({
        userId: user.id,
        mangaId,
        chapterId,
        lastPage,
        isCompleted: Boolean(isCompleted),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.chapterId],
        set: {
          lastPage,
          isCompleted: Boolean(isCompleted),
          updatedAt: new Date(),
        },
      });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to save progress' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const mangaId = request.nextUrl.searchParams.get('mangaId');

  const rows = await db
    .select()
    .from(readingProgress)
    .where(
      mangaId
        ? and(
            eq(readingProgress.userId, user.id),
            eq(readingProgress.mangaId, mangaId)
          )
        : eq(readingProgress.userId, user.id)
    );

  return NextResponse.json({ progress: rows });
}
