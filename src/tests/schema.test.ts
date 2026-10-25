import { describe, it, expect } from 'vitest';
import {
  manga,
  chapters,
  feedPages,
  searchCache,
  bookmarks,
  readingProgress,
} from '@/db/schema';
import { db } from '@/db';

describe('Drizzle schema', () => {
  it('exports all 6 required tables', () => {
    expect(manga).toBeDefined();
    expect(chapters).toBeDefined();
    expect(feedPages).toBeDefined();
    expect(searchCache).toBeDefined();
    expect(bookmarks).toBeDefined();
    expect(readingProgress).toBeDefined();
  });

  it('exports db client instance', () => {
    expect(db).toBeDefined();
    expect(typeof db.select).toBe('function');
  });

  it('verifies critical column definitions on manga table', () => {
    expect(manga.id).toBeDefined();
    expect(manga.title).toBeDefined();
    expect(manga.availableLanguages).toBeDefined();
    expect(manga.chapterCounts).toBeDefined();
  });

  it('verifies critical column definitions on chapters table', () => {
    expect(chapters.id).toBeDefined();
    expect(chapters.mangaId).toBeDefined();
    expect(chapters.chapterNumber).toBeDefined();
    expect(chapters.translatedLanguage).toBeDefined();
    expect(chapters.scanlationGroups).toBeDefined();
    expect(chapters.externalUrl).toBeDefined();
    expect(chapters.isUnavailable).toBeDefined();
  });
});
