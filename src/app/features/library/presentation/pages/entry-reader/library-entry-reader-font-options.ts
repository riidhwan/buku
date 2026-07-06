import { SeriesEntryReadingFontId } from '../../../domain/series-entry-reading-appearance';

export interface LibraryEntryReaderFontOption {
  readonly id: SeriesEntryReadingFontId;
  readonly label: string;
  readonly cssValue: string;
}

export const libraryEntryReaderFontOptions: readonly LibraryEntryReaderFontOption[] = [
  {
    id: 'libron',
    label: 'Libron',
    cssValue: '"Buku Libron", serif',
  },
  {
    id: 'sourcerer',
    label: 'Sourcerer',
    cssValue: '"Buku Sourcerer", serif',
  },
  {
    id: 'cartisse',
    label: 'Cartisse',
    cssValue: '"Buku Cartisse", serif',
  },
  {
    id: 'nv-charis',
    label: 'NV Charis',
    cssValue: '"Buku NV Charis", serif',
  },
  {
    id: 'nv-garamond',
    label: 'NV Garamond',
    cssValue: '"Buku NV Garamond", serif',
  },
  {
    id: 'nv-jost',
    label: 'NV Jost',
    cssValue: '"Buku NV Jost", sans-serif',
  },
  {
    id: 'nv-bitter',
    label: 'NV Bitter',
    cssValue: '"Buku NV Bitter", serif',
  },
  {
    id: 'nv-legible-next',
    label: 'NV Legible Next',
    cssValue: '"Buku NV Legible Next", sans-serif',
  },
  {
    id: 'nv-palatium',
    label: 'NV Palatium',
    cssValue: '"Buku NV Palatium", serif',
  },
];

const defaultLibraryEntryReaderFontOption: LibraryEntryReaderFontOption = {
  id: 'nv-charis',
  label: 'NV Charis',
  cssValue: '"Buku NV Charis", serif',
};

export function libraryEntryReaderFontOption(
  fontId: SeriesEntryReadingFontId,
): LibraryEntryReaderFontOption {
  return (
    libraryEntryReaderFontOptions.find((option) => option.id === fontId) ??
    defaultLibraryEntryReaderFontOption
  );
}
