import { Provider } from '@angular/core';

import { LibraryFacade } from '../application/library.facade';
import { LIBRARY_CLOCK } from '../application/ports/library-clock.port';
import { LIBRARY_CONTENT_SANITIZER } from '../application/ports/library-content-sanitizer.port';
import { LIBRARY_ID_GENERATOR } from '../application/ports/library-id-generator.port';
import { LIBRARY_REPOSITORY } from '../application/ports/library-repository.token';
import { ResetSeriesEntryContentOverrideUseCase } from '../application/reset-series-entry-content-override.use-case';
import { SaveSeriesEntryContentOverrideUseCase } from '../application/save-series-entry-content-override.use-case';
import { SaveReadingSnapshotToLibraryUseCase } from '../application/save-reading-snapshot-to-library.use-case';
import { BrowserLibraryContentSanitizerAdapter } from './browser-library-content-sanitizer.adapter';
import { CryptoLibraryIdGeneratorAdapter } from './crypto-library-id-generator.adapter';
import { LibraryLegacyPreferencesStore } from './library-legacy-preferences.store';
import { SqliteLibraryRepositoryAdapter } from './sqlite/sqlite-library-repository.adapter';
import { SystemLibraryClockAdapter } from './system-library-clock.adapter';

export function provideLibrary(): Provider[] {
  return [
    LibraryFacade,
    SaveReadingSnapshotToLibraryUseCase,
    SaveSeriesEntryContentOverrideUseCase,
    ResetSeriesEntryContentOverrideUseCase,
    BrowserLibraryContentSanitizerAdapter,
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
  ];
}
