import type { Config } from 'tailwindcss';

/**
 * Direction 2 — Tokyo Manga-Zine Editorial
 * Tokens locked in direction-approved.md
 */
const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#0f0f11',
        ink: '#f4f4f5',
        hairline: '#27272a',
        vermilion: {
          DEFAULT: '#e11d48',
          dark: '#9f1239',
        },
        muted: '#71717a',
      },
      fontFamily: {
        display: ['var(--font-cinzel)', 'serif'],
        editorial: ['var(--font-newsreader)', 'serif'],
        kanji: ['var(--font-noto-serif-jp)', 'serif'],
        meta: ['var(--font-space-grotesk)', 'sans-serif'],
      },
      borderRadius: {
        // Manga-zine styling favours near-square corners over pill-shaped ones.
        DEFAULT: '0.125rem',
      },
      letterSpacing: {
        masthead: '-0.02em',
      },
    },
  },
  plugins: [],
};

export default config;
