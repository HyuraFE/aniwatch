import Link from 'next/link';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  id: 'Indonesian',
  ja: 'Japanese',
  es: 'Spanish',
  fr: 'French',
  'pt-br': 'Portuguese (BR)',
  ko: 'Korean',
  it: 'Italian',
  de: 'German',
  ru: 'Russian',
  vi: 'Vietnamese',
  zh: 'Chinese (Simp)',
  'zh-hk': 'Chinese (Trad)',
  ar: 'Arabic',
};

export function getLanguageLabel(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase();
}

interface LanguageSelectorProps {
  mangaId: string;
  availableLanguages: string[];
  activeLanguage: string;
  chapterCounts?: Record<string, number>;
}

export function LanguageSelector({
  mangaId,
  availableLanguages,
  activeLanguage,
  chapterCounts = {},
}: LanguageSelectorProps) {
  if (!availableLanguages || availableLanguages.length === 0) {
    return null;
  }

  return (
    <div className="border border-hairline bg-zinc-950/80 p-4">
      <div className="flex items-center justify-between mb-3 border-b border-hairline pb-2">
        <div className="font-meta text-xs uppercase tracking-wider font-bold text-ink flex items-center gap-2">
          <span className="w-2 h-2 bg-vermilion inline-block"></span>
          TRANSLATION LANGUAGE REGISTRY
        </div>
        <span className="text-[11px] font-meta text-muted">
          Select language to view chapters:
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-meta text-xs">
        {availableLanguages.map((code) => {
          const isActive = code.toLowerCase() === activeLanguage.toLowerCase();
          const count = chapterCounts[code];

          return (
            <Link
              key={code}
              href={`/manga/${mangaId}?lang=${code}`}
              className={`p-2.5 border flex justify-between items-center text-left transition ${
                isActive
                  ? 'border-2 border-vermilion bg-vermilion/10 text-white font-bold'
                  : 'border-hairline hover:border-zinc-500 text-zinc-300'
              }`}
            >
              <span>
                {code.toUpperCase()} / {getLanguageLabel(code)}
              </span>
              {typeof count === 'number' && (
                <span
                  className={`text-[11px] ${
                    isActive ? 'text-vermilion font-bold' : 'text-muted'
                  }`}
                >
                  {count.toLocaleString()} ch
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
