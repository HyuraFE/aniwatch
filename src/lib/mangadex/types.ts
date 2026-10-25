export interface LocalizedString {
  [languageCode: string]: string;
}

export interface MangaDexRelationship {
  id: string;
  type: string;
  related?: string;
  attributes?: Record<string, any>;
}

export interface MangaDexMangaAttributes {
  title: LocalizedString;
  altTitles: LocalizedString[];
  description: LocalizedString;
  isLocked: boolean;
  links: Record<string, string>;
  originalLanguage: string;
  lastVolume: string;
  lastChapter: string;
  publicationDemographic: string | null;
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  year: number | null;
  contentRating: 'safe' | 'suggestive' | 'erotica' | 'pornographic';
  tags: Array<{
    id: string;
    type: string;
    attributes: {
      name: LocalizedString;
      group: 'genre' | 'theme' | 'format' | 'content';
    };
  }>;
  availableTranslatedLanguages: string[];
  latestUploadedChapter: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MangaDexManga {
  id: string;
  type: 'manga';
  attributes: MangaDexMangaAttributes;
  relationships: MangaDexRelationship[];
}

export interface MangaDexChapterAttributes {
  volume: string | null;
  chapter: string | null;
  title: string | null;
  translatedLanguage: string;
  externalUrl: string | null;
  isUnavailable: boolean;
  publishAt: string;
  readableAt: string;
  createdAt: string;
  updatedAt: string;
  pages: number;
  version: number;
}

export interface MangaDexChapter {
  id: string;
  type: 'chapter';
  attributes: MangaDexChapterAttributes;
  relationships: MangaDexRelationship[];
}

export interface MangaDexAggregateVolume {
  volume: string;
  count: number;
  chapters: Record<
    string,
    {
      chapter: string;
      id: string;
      others: string[];
      count: number;
    }
  >;
}

export interface MangaDexAggregateResponse {
  result: 'ok' | 'error';
  volumes: Record<string, MangaDexAggregateVolume>;
}

export interface MangaDexAtHomeResponse {
  result: 'ok' | 'error';
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
}
