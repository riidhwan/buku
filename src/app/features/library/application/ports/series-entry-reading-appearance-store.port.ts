import { InjectionToken } from '@angular/core';
import { SeriesEntryReadingAppearance } from '../../domain/series-entry-reading-appearance';

export interface SeriesEntryReadingAppearanceStore {
  readAppearance(): Promise<SeriesEntryReadingAppearance>;
  saveAppearance(appearance: SeriesEntryReadingAppearance): Promise<void>;
}

export const SERIES_ENTRY_READING_APPEARANCE_STORE =
  new InjectionToken<SeriesEntryReadingAppearanceStore>('SERIES_ENTRY_READING_APPEARANCE_STORE');
