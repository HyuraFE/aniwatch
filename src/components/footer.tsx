export function Footer() {
  return (
    <footer className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-16 border-t border-hairline text-center font-meta text-xs text-muted space-y-2">
      <div className="font-kanji font-bold text-vermilion text-sm">
        アニメウォッチ
      </div>
      <div>
        Data provided by{' '}
        <a
          href="https://api.mangadex.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-300 hover:text-vermilion underline underline-offset-2 font-bold"
        >
          MangaDex API
        </a>
        . All content rights belong to respective authors, publishers and
        scanlation groups.
      </div>
      <div>
        Aniwatch is an ad-free, non-commercial open reader. Scanlation group
        removal requests are honored via BLOCKED_GROUP_IDS.
      </div>
      <div className="text-zinc-600 pt-2">
        NON-COMMERCIAL ARCHIVE • NO ADS • DONATIONS WELCOME
      </div>
    </footer>
  );
}
