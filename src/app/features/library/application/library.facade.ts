import { Injectable, inject } from '@angular/core';
import { LibrarySeries, LibrarySeriesEntry, LibrarySeriesSummary } from '../domain/library-series';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';

@Injectable()
export class LibraryFacade {
  private readonly repository = inject(LIBRARY_REPOSITORY);

  public listSeries(): readonly LibrarySeriesSummary[] {
    return this.repository.listSeries();
  }

  public getSeries(seriesId: string): LibrarySeries | null {
    return this.repository.getSeries(seriesId);
  }

  public getEntry(seriesId: string, entryId: string): LibrarySeriesEntry | null {
    return this.repository.getEntry(seriesId, entryId);
  }
}
