'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'aniwatch:progress';

export interface StoredProgress {
  mangaId: string;
  lastPage: number;
  updatedAt: string;
}

export type ProgressStore = Record<string, StoredProgress>;

function readStore(): ProgressStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: ProgressStore) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage may be full or blocked; progress simply won't persist locally.
  }
}

/**
 * Tracks reading position. Writes to localStorage for guests and mirrors to
 * Supabase for signed-in users. Uses a debounce plus a beacon on page hide so
 * closing the tab mid-read still saves.
 */
export function ProgressTracker({
  mangaId,
  chapterId,
  pageIndex,
  totalPages,
  isSignedIn,
}: {
  mangaId: string;
  chapterId: string;
  pageIndex: number;
  totalPages: number;
  isSignedIn: boolean;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<number>(-1);

  useEffect(() => {
    if (pageIndex === lastSavedRef.current) return;
    lastSavedRef.current = pageIndex;

    // Always persist locally so guests get resume support
    const store = readStore();
    store[chapterId] = {
      mangaId,
      lastPage: pageIndex + 1,
      updatedAt: new Date().toISOString(),
    };
    writeStore(store);

    if (!isSignedIn) return;

    // Debounced server write
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void pushToServer(mangaId, chapterId, pageIndex + 1, totalPages);
    }, 1000);
  }, [pageIndex, mangaId, chapterId, totalPages, isSignedIn]);

  // Flush on tab hide / unload
  useEffect(() => {
    const flush = () => {
      if (!isSignedIn) return;
      const payload = JSON.stringify({
        mangaId,
        chapterId,
        lastPage: pageIndex + 1,
        isCompleted: pageIndex + 1 >= totalPages,
      });
      navigator.sendBeacon?.('/api/progress', payload);
    };

    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, [mangaId, chapterId, pageIndex, totalPages, isSignedIn]);

  return null;
}

async function pushToServer(
  mangaId: string,
  chapterId: string,
  lastPage: number,
  totalPages: number
) {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mangaId,
        chapterId,
        lastPage,
        isCompleted: lastPage >= totalPages,
      }),
    });
  } catch {
    // Best-effort; localStorage still holds the position.
  }
}
