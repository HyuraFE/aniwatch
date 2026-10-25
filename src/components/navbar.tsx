'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function Navbar({ libraryCount = 0 }: { libraryCount?: number }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="border-b-2 border-ink bg-paper sticky top-0 z-40">
      {/* Top Micro Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-1.5 flex justify-between items-center text-[11px] font-meta border-b border-hairline text-muted">
        <div className="flex items-center gap-2">
          <span>ANIWATCH ARCHIVE // ISSUE NO. 1024</span>
          <span className="hidden md:inline">•</span>
          <span className="text-vermilion font-bold tracking-widest hidden md:inline">
            無料漫画配信
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-zinc-400">
            DATA: MANGADEX V5 API
          </span>
          <span className="text-emerald-400 font-bold">● FREE MIRROR</span>
        </div>
      </div>

      {/* Main Masthead Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="font-kanji font-black text-xs px-2 py-0.5 bg-vermilion text-white tracking-widest">
              アニウォッチ
            </span>
            <span className="text-xs font-meta text-muted uppercase tracking-wider">
              Digital Publication System
            </span>
          </div>
          <Link href="/" className="inline-block">
            <h1 className="font-display font-black text-3xl sm:text-5xl tracking-masthead text-ink hover:opacity-95 transition">
              ANI<span className="italic font-editorial text-vermilion">WATCH</span>
            </h1>
          </Link>
        </div>

        {/* Search & Actions */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <form onSubmit={handleSearch} className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, author..."
              className="w-full bg-zinc-950 border border-hairline px-3 py-1.5 text-xs text-ink placeholder-muted focus:outline-none focus:border-vermilion transition font-meta"
            />
            <button
              type="submit"
              className="absolute right-2 top-1.5 text-xs font-meta text-muted hover:text-vermilion"
            >
              ↵
            </button>
          </form>

          {/* Navigation Segments */}
          <nav className="flex items-center border border-hairline divide-x divide-hairline text-xs font-meta font-bold uppercase tracking-wider">
            <Link
              href="/browse"
              className="px-3.5 py-1.5 hover:bg-zinc-900 text-zinc-300 hover:text-ink transition"
            >
              Browse
            </Link>
            <Link
              href="/library"
              className="px-3.5 py-1.5 hover:bg-zinc-900 text-zinc-300 hover:text-ink transition flex items-center gap-1.5"
            >
              Shelf{' '}
              {libraryCount > 0 && (
                <span className="text-vermilion">({libraryCount})</span>
              )}
            </Link>
            <Link
              href="/login"
              className="px-3.5 py-1.5 bg-vermilion hover:bg-vermilion-dark text-white transition"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
