import { Injectable } from '@angular/core';
import {
  LibrarySeries,
  LibrarySeriesEntry,
  LibrarySeriesEntrySummary,
  LibrarySeriesSummary,
} from '../domain/library-series';
import { LibraryRepository } from '../application/ports/library-repository.port';

interface MockLibrarySeriesRecord {
  readonly id: string;
  readonly title: string;
  readonly lastSavedAt: string;
  readonly entries: readonly LibrarySeriesEntry[];
}

const mockSeries: readonly MockLibrarySeriesRecord[] = [
  {
    id: 'series-1',
    title: 'The Clockwork Archive',
    lastSavedAt: '2026-01-19T10:15:00.000Z',
    entries: [
      {
        id: 'entry-1',
        seriesId: 'series-1',
        seriesTitle: 'The Clockwork Archive',
        displayTitle: 'Chapter 1: The Brass Door',
        sourceUrl: 'https://example.com/clockwork/archive/chapter-1',
        sourceHost: 'example.com',
        articleTitle: 'The Clockwork Archive - Chapter 1: The Brass Door',
        byline: 'Mira Vale',
        siteName: 'Example Reads',
        publishedTime: '2026-01-12T00:00:00.000Z',
        createdAt: '2026-01-12T09:30:00.000Z',
        updatedAt: '2026-01-12T09:30:00.000Z',
        contentHtml:
          '<p>The archive woke before the city bells, gears ticking behind walls of green glass.</p><p>Ana pressed her palm to the brass door and felt the lock count her pulse.</p><h2>A borrowed key</h2><p>By sunrise, everyone in the lower stacks would know someone had opened a room that did not exist yesterday.</p>',
      },
      {
        id: 'entry-2',
        seriesId: 'series-1',
        seriesTitle: 'The Clockwork Archive',
        displayTitle: 'Chapter 2: Index of Ash',
        sourceUrl: 'https://example.com/clockwork/archive/chapter-2',
        sourceHost: 'example.com',
        articleTitle: 'The Clockwork Archive - Chapter 2: Index of Ash',
        byline: 'Mira Vale',
        siteName: 'Example Reads',
        publishedTime: '2026-01-19T00:00:00.000Z',
        createdAt: '2026-01-19T10:15:00.000Z',
        updatedAt: '2026-01-19T10:15:00.000Z',
        contentHtml:
          '<p>The second ledger was warm, as if it had been written beside a fire that still remembered every name.</p><p>Ana found her own entry halfway down the page, filed under crimes not yet committed.</p>',
      },
    ],
  },
  {
    id: 'series-2',
    title: 'Northern Lights Field Notes',
    lastSavedAt: '2026-02-03T21:04:00.000Z',
    entries: [
      {
        id: 'entry-3',
        seriesId: 'series-2',
        seriesTitle: 'Northern Lights Field Notes',
        displayTitle: 'Saved 3 Feb 2026, 21:04',
        sourceUrl: 'https://observatory.example.net/notes/winter-sky',
        sourceHost: 'observatory.example.net',
        articleTitle: 'Winter sky observations from the ridge',
        byline: null,
        siteName: 'Ridge Observatory',
        publishedTime: '2026-02-03T00:00:00.000Z',
        createdAt: '2026-02-03T21:04:00.000Z',
        updatedAt: '2026-02-03T21:04:00.000Z',
        contentHtml:
          '<p>The first curtain appeared low over the ridge, pale enough to mistake for moonlit cloud.</p><p>By midnight the sky had separated into green bands, each one moving at a different speed.</p>',
      },
    ],
  },
  {
    id: 'series-3',
    title: 'A Practical Guide to Tea Houses',
    lastSavedAt: '2026-03-08T16:40:00.000Z',
    entries: [
      {
        id: 'entry-4',
        seriesId: 'series-3',
        seriesTitle: 'A Practical Guide to Tea Houses',
        displayTitle: 'Part 1: Water, Heat, Patience',
        sourceUrl: 'https://magazine.example.org/tea-houses/part-1',
        sourceHost: 'magazine.example.org',
        articleTitle: 'A Practical Guide to Tea Houses, Part 1',
        byline: 'Samira Chen',
        siteName: 'Small Rooms Magazine',
        publishedTime: '2026-03-08T00:00:00.000Z',
        createdAt: '2026-03-08T16:40:00.000Z',
        updatedAt: '2026-03-08T16:40:00.000Z',
        contentHtml:
          '<p>A good tea house starts with a room that lets the kettle be heard.</p><ul><li>Keep the entrance plain.</li><li>Let the table carry the color.</li><li>Leave space for silence.</li></ul>',
      },
    ],
  },
];

@Injectable()
export class MockLibraryRepositoryAdapter implements LibraryRepository {
  public listSeries(): readonly LibrarySeriesSummary[] {
    return mockSeries.map((series) => ({
      id: series.id,
      title: series.title,
      entryCount: series.entries.length,
      lastSavedAt: series.lastSavedAt,
    }));
  }

  public getSeries(seriesId: string): LibrarySeries | null {
    const series = mockSeries.find((candidate) => candidate.id === seriesId);
    if (series === undefined) {
      return null;
    }

    return {
      id: series.id,
      title: series.title,
      entries: series.entries.map((entry): LibrarySeriesEntrySummary => this.toEntrySummary(entry)),
    };
  }

  public getEntry(seriesId: string, entryId: string): LibrarySeriesEntry | null {
    const series = mockSeries.find((candidate) => candidate.id === seriesId);
    return series?.entries.find((entry) => entry.id === entryId) ?? null;
  }

  private toEntrySummary(entry: LibrarySeriesEntry): LibrarySeriesEntrySummary {
    return {
      id: entry.id,
      seriesId: entry.seriesId,
      displayTitle: entry.displayTitle,
      sourceHost: entry.sourceHost,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
