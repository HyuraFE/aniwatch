import Link from 'next/link';
import type { CatalogItem } from '@/lib/mangadex/api';

export function MangaCard({ item }: { item: CatalogItem }) {
  return (
    <Link
      href={`/manga/${item.id}`}
      className="group block focus:outline-none focus-visible:ring-1 focus-visible:ring-vermilion"
    >
      {/* Cover Plate */}
      <div className="relative border border-hairline bg-zinc-950 overflow-hidden">
        {item.coverUrl ? (
          <img
            src={item.coverUrl}
            alt={item.title}
            loading="lazy"
            className="w-full aspect-[2/3] object-cover group-hover:opacity-90 transition-opacity duration-300"
          />
        ) : (
          <div className="w-full aspect-[2/3] flex items-center justify-center text-muted font-meta text-xs">
            NO COVER
          </div>
        )}

        {/* Status Seal */}
        {item.status && (
          <div className="absolute top-0 left-0 bg-paper/90 border-r border-b border-hairline px-2 py-1 font-meta text-[10px] uppercase tracking-wider text-zinc-300">
            {item.status}
          </div>
        )}

        {/* Year Corner */}
        {item.year && (
          <div className="absolute bottom-0 right-0 bg-paper/90 border-l border-t border-hairline px-2 py-0.5 font-meta text-[10px] text-muted">
            {item.year}
          </div>
        )}
      </div>

      {/* Caption Block */}
      <div className="mt-2.5">
        <h3 className="font-editorial text-base font-semibold text-ink leading-tight group-hover:text-vermilion transition-colors line-clamp-2">
          {item.title}
        </h3>
        {item.latestUploadedChapter && (
          <p className="font-meta text-[11px] text-muted mt-1">
            CH.{item.latestUploadedChapter}
          </p>
        )}
      </div>
    </Link>
  );
}
