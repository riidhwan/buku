import { InjectionToken } from '@angular/core';
import { ReadingAppearance } from '../domain/reading-appearance';

export interface ReadingAppearanceStore {
  readAppearance(): Promise<ReadingAppearance>;
  saveAppearance(appearance: ReadingAppearance): Promise<void>;
}

export const READING_APPEARANCE_STORE = new InjectionToken<ReadingAppearanceStore>(
  'READING_APPEARANCE_STORE',
);
