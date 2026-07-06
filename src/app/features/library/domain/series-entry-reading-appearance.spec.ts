import {
  defaultSeriesEntryReadingAppearance,
  normalizeSeriesEntryReadingAppearance,
} from './series-entry-reading-appearance';

describe('Series Entry Reading Appearance', () => {
  it('keeps a valid selected font id', () => {
    expect(normalizeSeriesEntryReadingAppearance({ fontId: 'libron' })).toEqual({
      fontId: 'libron',
    });
  });

  it('falls back to NV Charis for missing or invalid font ids', () => {
    expect(normalizeSeriesEntryReadingAppearance({ fontId: 'missing-font' })).toEqual(
      defaultSeriesEntryReadingAppearance,
    );
    expect(normalizeSeriesEntryReadingAppearance(null)).toEqual(
      defaultSeriesEntryReadingAppearance,
    );
  });
});
