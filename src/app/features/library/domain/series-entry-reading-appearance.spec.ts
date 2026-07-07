import {
  defaultSeriesEntryReadingAppearance,
  normalizeSeriesEntryReadingAppearance,
} from './series-entry-reading-appearance';

describe('Series Entry Reading Appearance', () => {
  it('keeps a valid selected font id', () => {
    expect(normalizeSeriesEntryReadingAppearance({ fontId: 'libron' })).toEqual({
      fontId: 'libron',
      colorSchemeId: 'system',
    });
  });

  it('keeps a valid selected color scheme id', () => {
    expect(normalizeSeriesEntryReadingAppearance({ colorSchemeId: 'sepia' })).toEqual({
      fontId: 'nv-charis',
      colorSchemeId: 'sepia',
    });
  });

  it('falls back to NV Charis and system color for missing or invalid values', () => {
    expect(normalizeSeriesEntryReadingAppearance({ fontId: 'missing-font' })).toEqual(
      defaultSeriesEntryReadingAppearance,
    );
    expect(normalizeSeriesEntryReadingAppearance({ colorSchemeId: 'missing-color' })).toEqual(
      defaultSeriesEntryReadingAppearance,
    );
    expect(normalizeSeriesEntryReadingAppearance(null)).toEqual(
      defaultSeriesEntryReadingAppearance,
    );
  });
});
