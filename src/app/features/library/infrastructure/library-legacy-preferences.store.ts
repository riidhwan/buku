import { inject, InjectionToken, Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

import {
  LibraryDocument,
  LibrarySeriesRecord,
  LibraryStoredSeriesEntry,
} from '../domain/library-series';

interface PreferencesPort {
  get(options: { readonly key: string }): Promise<{ readonly value: string | null }>;
  set(options: { readonly key: string; readonly value: string }): Promise<void>;
}

interface StoredLibraryDocument {
  readonly version: 1;
  readonly series: readonly LibrarySeriesRecord[];
}

export type LoadLegacyLibraryDocumentResult =
  | {
      readonly ok: true;
      readonly document: LibraryDocument | null;
    }
  | {
      readonly ok: false;
      readonly reason: 'persistenceFailed';
    };

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
const sqliteMigrationMarkerKey = 'library.sqliteMigration.v1';

@Injectable()
export class LibraryLegacyPreferencesStore {
  private readonly preferences = inject(LIBRARY_CAPACITOR_PREFERENCES);

  public async hasMigratedToSqlite(): Promise<boolean> {
    const result = await this.preferences.get({ key: sqliteMigrationMarkerKey });
    return result.value === 'done';
  }

  public async markMigratedToSqlite(): Promise<void> {
    await this.preferences.set({ key: sqliteMigrationMarkerKey, value: 'done' });
  }

  public async loadDocument(): Promise<LoadLegacyLibraryDocumentResult> {
    try {
      const result = await this.preferences.get({ key: libraryDocumentKey });
      return {
        ok: true,
        document: result.value === null ? null : parseDocument(result.value),
      };
    } catch (_error) {
      return { ok: false, reason: 'persistenceFailed' };
    }
  }
}

function parseDocument(value: string): LibraryDocument {
  const parsed: unknown = JSON.parse(value);
  if (!isStoredLibraryDocument(parsed)) {
    return { series: [] };
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

function isEntry(value: unknown): value is LibraryStoredSeriesEntry {
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
