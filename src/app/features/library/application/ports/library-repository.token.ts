import { InjectionToken } from '@angular/core';
import { LibraryRepository } from './library-repository.port';

export const LIBRARY_REPOSITORY = new InjectionToken<LibraryRepository>('LIBRARY_REPOSITORY');
