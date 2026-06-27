import { inject, Injectable } from '@angular/core';
import { LIBRARY_CLOCK } from './ports/library-clock.port';
import { LIBRARY_ID_GENERATOR } from './ports/library-id-generator.port';
import { SaveLibraryEntryTarget } from './ports/library-repository.port';
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

    const createdAt = this.clock.now();
    const saved = await this.repository.saveEntry({
      target: this.saveTarget(input.target, seriesTitle, createdAt),
      entry: {
        id: this.idGenerator.createId(),
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
      },
    });
    if (!saved.ok) {
      return { status: 'persistenceFailed' };
    }
    if (saved.status === 'missingSeries') {
      return { status: 'validationFailed', message: 'Selected Series is no longer available.' };
    }

    return {
      status: saved.status,
      seriesId: saved.seriesId,
      entryId: saved.entryId,
    };
  }

  private targetTitle(target: LibrarySeriesSaveTarget): string {
    return target.kind === 'title' ? normalizeTitle(target.title) : target.seriesId.trim();
  }

  private saveTarget(
    target: LibrarySeriesSaveTarget,
    seriesTitle: string,
    createdAt: string,
  ): SaveLibraryEntryTarget {
    if (target.kind === 'existing') {
      return target;
    }

    return {
      kind: 'title',
      seriesId: this.idGenerator.createId(),
      title: seriesTitle,
      normalizedTitle: normalizeTitleKey(seriesTitle),
      createdAt,
    } as const;
  }
}

export function normalizeTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeTitleKey(value: string): string {
  return normalizeTitle(value).toLowerCase();
}

function sourceHost(sourceUrl: string): string | null {
  try {
    return new URL(sourceUrl).hostname;
  } catch (_error) {
    return null;
  }
}
