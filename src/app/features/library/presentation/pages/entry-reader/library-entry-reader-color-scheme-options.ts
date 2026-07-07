import { SeriesEntryReadingColorSchemeId } from '../../../domain/series-entry-reading-appearance';

export interface LibraryEntryReaderColorSchemeOption {
  readonly id: SeriesEntryReadingColorSchemeId;
  readonly label: string;
}

export const libraryEntryReaderColorSchemeOptions: readonly LibraryEntryReaderColorSchemeOption[] =
  [
    {
      id: 'system',
      label: 'System',
    },
    {
      id: 'light',
      label: 'Light',
    },
    {
      id: 'paper',
      label: 'Paper',
    },
    {
      id: 'sepia',
      label: 'Sepia',
    },
    {
      id: 'dark',
      label: 'Dark',
    },
  ];
