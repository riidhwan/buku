import { Provider } from '@angular/core';

import { LibraryFacade } from '../application/library.facade';
import { LIBRARY_CLOCK } from '../application/ports/library-clock.port';
import { LIBRARY_CONTENT_SANITIZER } from '../application/ports/library-content-sanitizer.port';
import { LIBRARY_ID_GENERATOR } from '../application/ports/library-id-generator.port';
import { LIBRARY_REPOSITORY } from '../application/ports/library-repository.token';
import { SERIES_ENTRY_READING_APPEARANCE_STORE } from '../application/ports/series-entry-reading-appearance-store.port';
import { ResetSeriesEntryContentOverrideUseCase } from '../application/reset-series-entry-content-override.use-case';
import { SaveSeriesEntryContentOverrideUseCase } from '../application/save-series-entry-content-override.use-case';
import { SaveSeriesEntryEditUseCase } from '../application/save-series-entry-edit.use-case';
import { SaveSeriesEntryHeaderVisibilityUseCase } from '../application/save-series-entry-header-visibility.use-case';
import { SaveReadingSnapshotToLibraryUseCase } from '../application/save-reading-snapshot-to-library.use-case';
import { BrowserLibraryContentSanitizerAdapter } from './browser-library-content-sanitizer.adapter';
import { CapacitorSeriesEntryReadingAppearanceStoreAdapter } from './capacitor-series-entry-reading-appearance-store.adapter';
import { CryptoLibraryIdGeneratorAdapter } from './crypto-library-id-generator.adapter';
import { LibraryLegacyPreferencesStore } from './library-legacy-preferences.store';
import { SqliteLibraryRepositoryAdapter } from './sqlite/sqlite-library-repository.adapter';
import { SystemLibraryClockAdapter } from './system-library-clock.adapter';

export function provideLibrary(): Provider[] {
  return [
    LibraryFacade,
    SaveReadingSnapshotToLibraryUseCase,
    SaveSeriesEntryContentOverrideUseCase,
    SaveSeriesEntryEditUseCase,
    SaveSeriesEntryHeaderVisibilityUseCase,
    ResetSeriesEntryContentOverrideUseCase,
    BrowserLibraryContentSanitizerAdapter,
    CapacitorSeriesEntryReadingAppearanceStoreAdapter,
    LibraryLegacyPreferencesStore,
    SqliteLibraryRepositoryAdapter,
    SystemLibraryClockAdapter,
    CryptoLibraryIdGeneratorAdapter,
    {
      provide: LIBRARY_REPOSITORY,
      useExisting: SqliteLibraryRepositoryAdapter,
    },
    {
      provide: LIBRARY_CLOCK,
      useExisting: SystemLibraryClockAdapter,
    },
    {
      provide: LIBRARY_ID_GENERATOR,
      useExisting: CryptoLibraryIdGeneratorAdapter,
    },
    {
      provide: LIBRARY_CONTENT_SANITIZER,
      useExisting: BrowserLibraryContentSanitizerAdapter,
    },
    {
      provide: SERIES_ENTRY_READING_APPEARANCE_STORE,
      useExisting: CapacitorSeriesEntryReadingAppearanceStoreAdapter,
    },
  ];
}
