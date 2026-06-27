import { InjectionToken } from '@angular/core';

export interface LibraryIdGenerator {
  createId(): string;
}

export const LIBRARY_ID_GENERATOR = new InjectionToken<LibraryIdGenerator>('LIBRARY_ID_GENERATOR');
