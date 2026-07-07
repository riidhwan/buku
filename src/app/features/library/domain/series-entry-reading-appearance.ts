export const seriesEntryReadingFontIds = [
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

export type SeriesEntryReadingFontId = (typeof seriesEntryReadingFontIds)[number];

export const seriesEntryReadingColorSchemeIds = [
  'system',
  'light',
  'paper',
  'sepia',
  'dark',
] as const;

export type SeriesEntryReadingColorSchemeId = (typeof seriesEntryReadingColorSchemeIds)[number];

export interface SeriesEntryReadingAppearance {
  readonly fontId: SeriesEntryReadingFontId;
  readonly colorSchemeId: SeriesEntryReadingColorSchemeId;
}

export const defaultSeriesEntryReadingFontId: SeriesEntryReadingFontId = 'nv-charis';
export const defaultSeriesEntryReadingColorSchemeId: SeriesEntryReadingColorSchemeId = 'system';

export const defaultSeriesEntryReadingAppearance: SeriesEntryReadingAppearance = {
  fontId: defaultSeriesEntryReadingFontId,
  colorSchemeId: defaultSeriesEntryReadingColorSchemeId,
};

export function isSeriesEntryReadingFontId(value: unknown): value is SeriesEntryReadingFontId {
  return typeof value === 'string' && seriesEntryReadingFontIds.some((fontId) => fontId === value);
}

export function isSeriesEntryReadingColorSchemeId(
  value: unknown,
): value is SeriesEntryReadingColorSchemeId {
  return (
    typeof value === 'string' &&
    seriesEntryReadingColorSchemeIds.some((colorSchemeId) => colorSchemeId === value)
  );
}

export function normalizeSeriesEntryReadingAppearance(
  value: unknown,
): SeriesEntryReadingAppearance {
  if (!isRecord(value)) {
    return defaultSeriesEntryReadingAppearance;
  }

  const fontId = value['fontId'];
  const colorSchemeId = value['colorSchemeId'];
  return {
    fontId: isSeriesEntryReadingFontId(fontId) ? fontId : defaultSeriesEntryReadingFontId,
    colorSchemeId: isSeriesEntryReadingColorSchemeId(colorSchemeId)
      ? colorSchemeId
      : defaultSeriesEntryReadingColorSchemeId,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
