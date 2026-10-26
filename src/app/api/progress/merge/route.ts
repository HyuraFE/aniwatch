import { NextResponse, type NextRequest } from 'next/server';
import { mergeGuestProgress } from '@/lib/progress-server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let body: { guestMap?: any };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.guestMap || typeof body.guestMap !== 'object') {
    return NextResponse.json(
      { error: 'guestMap object is required' },
      { status: 400 }
    );
  }

  try {
    await mergeGuestProgress(user.id, body.guestMap);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Merge failed' },
      { status: 500 }
    );
  }
}
