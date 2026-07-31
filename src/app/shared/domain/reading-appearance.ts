export const readingFontIds = [
  'libron',
  'sourcerer',
  'cartisse',
  'nv-charis',
  'nv-garamond',
  'nv-jost',
  'nv-bitter',
  'nv-legible-next',
  'nv-palatium',
] as const;

export type ReadingFontId = (typeof readingFontIds)[number];

export const readingColorSchemeIds = ['system', 'light', 'paper', 'sepia', 'dark'] as const;

export type ReadingColorSchemeId = (typeof readingColorSchemeIds)[number];

export interface ReadingAppearance {
  readonly fontId: ReadingFontId;
  readonly colorSchemeId: ReadingColorSchemeId;
}

export const defaultReadingFontId: ReadingFontId = 'nv-charis';
export const defaultReadingColorSchemeId: ReadingColorSchemeId = 'system';

export const defaultReadingAppearance: ReadingAppearance = {
  fontId: defaultReadingFontId,
  colorSchemeId: defaultReadingColorSchemeId,
};

export function isReadingFontId(value: unknown): value is ReadingFontId {
  return typeof value === 'string' && readingFontIds.some((fontId) => fontId === value);
}

export function isReadingColorSchemeId(value: unknown): value is ReadingColorSchemeId {
  return (
    typeof value === 'string' &&
    readingColorSchemeIds.some((colorSchemeId) => colorSchemeId === value)
  );
}

export function normalizeReadingAppearance(value: unknown): ReadingAppearance {
  if (!isRecord(value)) {
    return defaultReadingAppearance;
  }

  const fontId = value['fontId'];
  const colorSchemeId = value['colorSchemeId'];
  return {
    fontId: isReadingFontId(fontId) ? fontId : defaultReadingFontId,
    colorSchemeId: isReadingColorSchemeId(colorSchemeId)
      ? colorSchemeId
      : defaultReadingColorSchemeId,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
