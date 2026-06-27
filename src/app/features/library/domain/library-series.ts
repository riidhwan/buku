export interface LibrarySeriesSummary {
  readonly id: string;
  readonly title: string;
  readonly entryCount: number;
  readonly lastSavedAt: string;
}

export interface LibrarySeries {
  readonly id: string;
  readonly title: string;
  readonly entries: readonly LibrarySeriesEntrySummary[];
}

export interface LibrarySeriesEntrySummary {
  readonly id: string;
  readonly seriesId: string;
  readonly displayTitle: string;
  readonly sourceHost: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LibrarySeriesEntry {
  readonly id: string;
  readonly seriesId: string;
  readonly seriesTitle: string;
  readonly displayTitle: string;
  readonly sourceUrl: string;
  readonly sourceHost: string | null;
  readonly articleTitle: string;
  readonly byline: string | null;
  readonly siteName: string | null;
  readonly publishedTime: string | null;
  readonly contentHtml: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LibrarySeriesRecord {
  readonly id: string;
  readonly title: string;
  readonly entries: readonly LibrarySeriesEntry[];
}

export interface LibraryDocument {
  readonly series: readonly LibrarySeriesRecord[];
}
