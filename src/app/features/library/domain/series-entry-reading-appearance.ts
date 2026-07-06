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

export interface SeriesEntryReadingAppearance {
  readonly fontId: SeriesEntryReadingFontId;
}

export const defaultSeriesEntryReadingFontId: SeriesEntryReadingFontId = 'nv-charis';

export const defaultSeriesEntryReadingAppearance: SeriesEntryReadingAppearance = {
  fontId: defaultSeriesEntryReadingFontId,
};

export function isSeriesEntryReadingFontId(value: unknown): value is SeriesEntryReadingFontId {
  return typeof value === 'string' && seriesEntryReadingFontIds.some((fontId) => fontId === value);
}

export function normalizeSeriesEntryReadingAppearance(
  value: unknown,
): SeriesEntryReadingAppearance {
  if (!isRecord(value)) {
    return defaultSeriesEntryReadingAppearance;
  }

  const fontId = value['fontId'];
  return {
    fontId: isSeriesEntryReadingFontId(fontId) ? fontId : defaultSeriesEntryReadingFontId,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
