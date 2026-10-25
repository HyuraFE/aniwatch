import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aniwatch — Digital Publication System',
  description:
    'Free, ad-free manga and manhwa reader powered by the MangaDex API. Multi-language chapter availability, webtoon and paged reading modes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
