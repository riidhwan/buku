import { ReadingColorSchemeId, ReadingFontId } from '../domain/reading-appearance';

export interface ReadingColorSchemeOption {
  readonly id: ReadingColorSchemeId;
  readonly label: string;
}

export interface ReadingFontOption {
  readonly id: ReadingFontId;
  readonly label: string;
  readonly cssValue: string;
}

export const readingColorSchemeOptions: readonly ReadingColorSchemeOption[] = [
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

export const readingFontOptions: readonly ReadingFontOption[] = [
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

const defaultReadingFontOption: ReadingFontOption = {
  id: 'nv-charis',
  label: 'NV Charis',
  cssValue: '"Buku NV Charis", serif',
};

export function readingFontOption(fontId: ReadingFontId): ReadingFontOption {
  return readingFontOptions.find((option) => option.id === fontId) ?? defaultReadingFontOption;
}
