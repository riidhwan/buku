import { Provider } from '@angular/core';
import { LibraryFacade } from '../application/library.facade';
import { LIBRARY_CLOCK } from '../application/ports/library-clock.port';
import { LIBRARY_ID_GENERATOR } from '../application/ports/library-id-generator.port';
import { LIBRARY_REPOSITORY } from '../application/ports/library-repository.token';
import { SaveReadingSnapshotToLibraryUseCase } from '../application/save-reading-snapshot-to-library.use-case';
import { CryptoLibraryIdGeneratorAdapter } from './crypto-library-id-generator.adapter';
import { LibraryPreferencesAdapter } from './library-preferences.adapter';
import { SystemLibraryClockAdapter } from './system-library-clock.adapter';

export function provideLibrary(): Provider[] {
  return [
    LibraryFacade,
    SaveReadingSnapshotToLibraryUseCase,
    LibraryPreferencesAdapter,
    SystemLibraryClockAdapter,
    CryptoLibraryIdGeneratorAdapter,
    {
      provide: LIBRARY_REPOSITORY,
      useExisting: LibraryPreferencesAdapter,
    },
    {
      provide: LIBRARY_CLOCK,
      useExisting: SystemLibraryClockAdapter,
    },
    {
      provide: LIBRARY_ID_GENERATOR,
      useExisting: CryptoLibraryIdGeneratorAdapter,
    },
  ];
}
