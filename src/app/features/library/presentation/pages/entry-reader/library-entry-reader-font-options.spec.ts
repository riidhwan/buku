import { SeriesEntryReadingFontId } from '../../../domain/series-entry-reading-appearance';
import { libraryEntryReaderFontOption } from './library-entry-reader-font-options';

describe('libraryEntryReaderFontOption', () => {
  it('returns display metadata for a selected font id', () => {
    expect(libraryEntryReaderFontOption('nv-jost')).toEqual({
      id: 'nv-jost',
      label: 'NV Jost',
      cssValue: '"Buku NV Jost", sans-serif',
    });
  });

  it('falls back to NV Charis when an unknown id reaches the UI', () => {
    expect(libraryEntryReaderFontOption('unknown' as SeriesEntryReadingFontId)).toEqual({
      id: 'nv-charis',
      label: 'NV Charis',
      cssValue: '"Buku NV Charis", serif',
    });
  });
});
