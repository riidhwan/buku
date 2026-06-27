import {
  LibrarySeries,
  LibrarySeriesEntry,
  LibrarySeriesSummary,
} from '../../domain/library-series';

export interface LibraryRepository {
  listSeries(): readonly LibrarySeriesSummary[];
  getSeries(seriesId: string): LibrarySeries | null;
  getEntry(seriesId: string, entryId: string): LibrarySeriesEntry | null;
}
