import { InjectionToken } from '@angular/core';

export interface LibraryClock {
  now(): string;
}

export const LIBRARY_CLOCK = new InjectionToken<LibraryClock>('LIBRARY_CLOCK');
