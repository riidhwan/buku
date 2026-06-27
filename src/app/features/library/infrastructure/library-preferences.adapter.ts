import { inject, InjectionToken, Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { LibraryDocument, LibrarySeriesEntry, LibrarySeriesRecord } from '../domain/library-series';
import {
  LibraryRepository,
  LoadLibraryResult,
  SaveLibraryDocumentResult,
} from '../application/ports/library-repository.port';

interface PreferencesPort {
  get(options: { readonly key: string }): Promise<{ readonly value: string | null }>;
  set(options: { readonly key: string; readonly value: string }): Promise<void>;
}

interface StoredLibraryDocument {
  readonly version: 1;
  readonly series: readonly LibrarySeriesRecord[];
}

export const LIBRARY_CAPACITOR_PREFERENCES = new InjectionToken<PreferencesPort>(
  'LIBRARY_CAPACITOR_PREFERENCES',
  {
    factory: () => ({
      get: (options) => Preferences.get(options),
      set: (options) => Preferences.set(options),
    }),
  },
);

const libraryDocumentKey = 'library.document';
const emptyDocument: LibraryDocument = { series: [] };

@Injectable()
export class LibraryPreferencesAdapter implements LibraryRepository {
  private readonly preferences = inject(LIBRARY_CAPACITOR_PREFERENCES);

  public async load(): Promise<LoadLibraryResult> {
    try {
      const result = await this.preferences.get({ key: libraryDocumentKey });
      if (result.value === null) {
        return { ok: true, document: emptyDocument };
      }

      return { ok: true, document: parseDocument(result.value) };
    } catch (_error) {
      return { ok: false, reason: 'persistenceFailed' };
    }
  }

  public async save(document: LibraryDocument): Promise<SaveLibraryDocumentResult> {
    try {
      const stored: StoredLibraryDocument = {
        version: 1,
        series: document.series,
      };
      await this.preferences.set({ key: libraryDocumentKey, value: JSON.stringify(stored) });
      return { ok: true };
    } catch (_error) {
      return { ok: false, reason: 'persistenceFailed' };
    }
  }
}

function parseDocument(value: string): LibraryDocument {
  const parsed: unknown = JSON.parse(value);
  if (!isStoredLibraryDocument(parsed)) {
    return emptyDocument;
  }

  return { series: parsed.series };
}

function isStoredLibraryDocument(value: unknown): value is StoredLibraryDocument {
  return isRecord(value) && value['version'] === 1 && isSeriesArray(value['series']);
}

function isSeriesArray(value: unknown): value is readonly LibrarySeriesRecord[] {
  return Array.isArray(value) && value.every(isSeriesRecord);
}

function isSeriesRecord(value: unknown): value is LibrarySeriesRecord {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['title'] === 'string' &&
    Array.isArray(value['entries']) &&
    value['entries'].every(isEntry)
  );
}

const requiredEntryStringFields = [
  'id',
  'seriesId',
  'seriesTitle',
  'displayTitle',
  'sourceUrl',
  'articleTitle',
  'contentHtml',
  'createdAt',
  'updatedAt',
] as const;

const nullableEntryStringFields = ['sourceHost', 'byline', 'siteName', 'publishedTime'] as const;

function isEntry(value: unknown): value is LibrarySeriesEntry {
  return (
    isRecord(value) &&
    requiredEntryStringFields.every((field) => typeof value[field] === 'string') &&
    nullableEntryStringFields.every((field) => isNullableString(value[field]))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}
