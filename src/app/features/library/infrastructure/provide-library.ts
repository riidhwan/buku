import { Provider } from '@angular/core';
import { LibraryFacade } from '../application/library.facade';
import { LIBRARY_REPOSITORY } from '../application/ports/library-repository.token';
import { MockLibraryRepositoryAdapter } from './mock-library-repository.adapter';

export function provideLibrary(): Provider[] {
  return [
    LibraryFacade,
    MockLibraryRepositoryAdapter,
    {
      provide: LIBRARY_REPOSITORY,
      useExisting: MockLibraryRepositoryAdapter,
    },
  ];
}
