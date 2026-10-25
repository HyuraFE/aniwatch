export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <p className="font-meta text-xs uppercase tracking-widest text-vermilion mb-4">
          Digital Publication System
        </p>
        <h1 className="font-display font-black text-5xl tracking-masthead text-ink mb-6">
          ANI<span className="italic font-editorial text-vermilion">WATCH</span>
        </h1>
        <p className="font-editorial text-lg text-muted leading-relaxed">
          Free, ad-free manga and manhwa reading. MangaDex API data,
          multi-language chapter availability, webtoon and paged modes.
        </p>
      </div>
    </main>
  );
}
