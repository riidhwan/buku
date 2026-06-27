import { inject, Injectable } from '@angular/core';
import { LibraryDocument, LibrarySeriesEntry, LibrarySeriesRecord } from '../domain/library-series';
import { LIBRARY_CLOCK } from './ports/library-clock.port';
import { LIBRARY_ID_GENERATOR } from './ports/library-id-generator.port';
import { LIBRARY_REPOSITORY } from './ports/library-repository.token';

export interface LibraryReadingSnapshot {
  readonly url: string;
  readonly title: string;
  readonly byline: string | null;
  readonly siteName: string | null;
  readonly publishedTime: string | null;
  readonly contentHtml: string;
}

export type LibrarySeriesSaveTarget =
  | {
      readonly kind: 'existing';
      readonly seriesId: string;
    }
  | {
      readonly kind: 'title';
      readonly title: string;
    };

export interface SaveReadingSnapshotToLibraryInput {
  readonly snapshot: LibraryReadingSnapshot;
  readonly entryTitle: string;
  readonly target: LibrarySeriesSaveTarget;
}

export type SaveReadingSnapshotToLibraryResult =
  | {
      readonly status: 'saved';
      readonly seriesId: string;
      readonly entryId: string;
    }
  | {
      readonly status: 'duplicate';
      readonly seriesId: string;
      readonly entryId: string;
    }
  | {
      readonly status: 'validationFailed';
      readonly message: string;
    }
  | {
      readonly status: 'persistenceFailed';
    };

type ResolveTargetSeriesResult =
  | {
      readonly status: 'resolved';
      readonly series: LibrarySeriesRecord;
    }
  | {
      readonly status: 'validationFailed';
      readonly message: string;
    };

@Injectable()
export class SaveReadingSnapshotToLibraryUseCase {
  private readonly repository = inject(LIBRARY_REPOSITORY);
  private readonly clock = inject(LIBRARY_CLOCK);
  private readonly idGenerator = inject(LIBRARY_ID_GENERATOR);

  public async execute(
    input: SaveReadingSnapshotToLibraryInput,
  ): Promise<SaveReadingSnapshotToLibraryResult> {
    const entryTitle = normalizeTitle(input.entryTitle);
    const seriesTitle = this.targetTitle(input.target);
    if (entryTitle === '' || seriesTitle === '') {
      return { status: 'validationFailed', message: 'Series and entry title are required.' };
    }

    const loaded = await this.repository.load();
    if (!loaded.ok) {
      return { status: 'persistenceFailed' };
    }

    const target = this.resolveTargetSeries(loaded.document, input.target, seriesTitle);
    if (target.status === 'validationFailed') {
      return target;
    }

    const duplicate = target.series.entries.find((entry) => entry.sourceUrl === input.snapshot.url);
    if (duplicate !== undefined) {
      return { status: 'duplicate', seriesId: target.series.id, entryId: duplicate.id };
    }

    const createdAt = this.clock.now();
    const entry = this.createEntry(input, target.series, entryTitle, createdAt);
    const updatedDocument = upsertEntry(loaded.document, target.series, entry);
    const saved = await this.repository.save(updatedDocument);
    if (!saved.ok) {
      return { status: 'persistenceFailed' };
    }

    return { status: 'saved', seriesId: target.series.id, entryId: entry.id };
  }

  private targetTitle(target: LibrarySeriesSaveTarget): string {
    return target.kind === 'title' ? normalizeTitle(target.title) : target.seriesId.trim();
  }

  private resolveTargetSeries(
    document: LibraryDocument,
    target: LibrarySeriesSaveTarget,
    normalizedTitle: string,
  ): ResolveTargetSeriesResult {
    if (target.kind === 'existing') {
      const series = document.series.find((candidate) => candidate.id === target.seriesId);
      return series === undefined
        ? { status: 'validationFailed', message: 'Selected Series is no longer available.' }
        : { status: 'resolved', series };
    }

    const exactMatch = document.series.find(
      (candidate) =>
        normalizeTitle(candidate.title).toLocaleLowerCase() === normalizedTitle.toLocaleLowerCase(),
    );
    return {
      status: 'resolved',
      series: exactMatch ?? {
        id: this.idGenerator.createId(),
        title: normalizedTitle,
        entries: [],
      },
    };
  }

  private createEntry(
    input: SaveReadingSnapshotToLibraryInput,
    series: LibrarySeriesRecord,
    entryTitle: string,
    createdAt: string,
  ): LibrarySeriesEntry {
    return {
      id: this.idGenerator.createId(),
      seriesId: series.id,
      seriesTitle: series.title,
      displayTitle: entryTitle,
      sourceUrl: input.snapshot.url,
      sourceHost: sourceHost(input.snapshot.url),
      articleTitle: input.snapshot.title,
      byline: input.snapshot.byline,
      siteName: input.snapshot.siteName,
      publishedTime: input.snapshot.publishedTime,
      contentHtml: input.snapshot.contentHtml,
      createdAt,
      updatedAt: createdAt,
    };
  }
}

export function normalizeTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function upsertEntry(
  document: LibraryDocument,
  series: LibrarySeriesRecord,
  entry: LibrarySeriesEntry,
): LibraryDocument {
  const updatedSeries = { ...series, entries: [...series.entries, entry] };
  const existingIndex = document.series.findIndex((candidate) => candidate.id === series.id);
  if (existingIndex === -1) {
    return { series: [...document.series, updatedSeries] };
  }

  return {
    series: document.series.map((candidate) =>
      candidate.id === series.id ? updatedSeries : candidate,
    ),
  };
}

function sourceHost(sourceUrl: string): string | null {
  try {
    return new URL(sourceUrl).hostname;
  } catch (_error) {
    return null;
  }
}
