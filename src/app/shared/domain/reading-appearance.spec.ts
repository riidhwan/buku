import { defaultReadingAppearance, normalizeReadingAppearance } from './reading-appearance';

describe('Reading Appearance', () => {
  it('keeps a valid selected font id', () => {
    expect(normalizeReadingAppearance({ fontId: 'libron' })).toEqual({
      fontId: 'libron',
      colorSchemeId: 'system',
    });
  });

  it('keeps a valid selected color scheme id', () => {
    expect(normalizeReadingAppearance({ colorSchemeId: 'sepia' })).toEqual({
      fontId: 'nv-charis',
      colorSchemeId: 'sepia',
    });
  });

  it('falls back to NV Charis and system color for missing or invalid values', () => {
    expect(normalizeReadingAppearance({ fontId: 'missing-font' })).toEqual(
      defaultReadingAppearance,
    );
    expect(normalizeReadingAppearance({ colorSchemeId: 'missing-color' })).toEqual(
      defaultReadingAppearance,
    );
    expect(normalizeReadingAppearance(null)).toEqual(defaultReadingAppearance);
  });
});
