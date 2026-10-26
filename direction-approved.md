# Direction Approved Gate

**Date:** 2026-10-25
**Skill:** huashu-design v3.0.0
**Project:** Aniwatch (Manga/Manhwa Reader & Catalog)

## Decision Record

- **User Choice:** Direction 2 — Tokyo Manga-Zine Editorial
- **User Words:** "i'll go with direction 2 for the implementation"
- **Approved Prototype File:** `design-demos/dir-2.html`
- **Screenshot Evidence:** `design-demos/dir-2.png`

## Design System Tokens Locked for Implementation

### Palette
- **Paper Background:** `#0f0f11` (rich ink-black)
- **Ink Foreground:** `#f4f4f5` (soft off-white)
- **Hairline Borders:** `#27272a` (zinc-800 1px borders)
- **Vermilion Stamp (Primary Accent):** `#e11d48` (Japanese hanko red)
- **Vermilion Dark:** `#9f1239` (hover / pressed states)
- **Muted Text / Metadata:** `#71717a` (zinc-500)

### Typography
- **Display / Masthead:** `Cinzel` (bold serif display)
- **Editorial / Body / Titles:** `Newsreader` (optical-sized editorial serif)
- **Kanji Accents:** `Noto Serif JP` (weight 700 / 900)
- **Metadata / Tables / Numbers:** `Space Grotesk` (clean geometric sans with tabular numerals)

### Structural Motifs
1. **Masthead Header:** Two-tier magazine header with publication date/issue micro-bar and bilingual kanji brand stamp (`アニウォッチ`).
2. **Language Registry:** 1px bordered grid table showing translations with chapter counts (`EN / English [1,196 ch]`, `ID / Indonesia [14 ch]`).
3. **Table of Contents (Chapter List):** Serialized print table with large vermilion numbers (`#1196`), serif chapter titles, and bordered `Read on MangaPlus ↗` badges for official releases.
4. **Manga Reader Spread:** Black backdrop with paper-framed page viewport, RTL (right-to-left) reading direction default for Japanese manga, and vermilion progress accents.
