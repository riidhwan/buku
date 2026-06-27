import { MockLibraryRepositoryAdapter } from './mock-library-repository.adapter';

describe('MockLibraryRepositoryAdapter', () => {
  it('exposes mock Series summaries', () => {
    const repository = new MockLibraryRepositoryAdapter();

    const series = repository.listSeries();

    expect(series.length).toBeGreaterThan(0);
    expect(series[0]).toEqual({
      id: 'series-1',
      title: 'The Clockwork Archive',
      entryCount: 2,
      lastSavedAt: '2026-01-19T10:15:00.000Z',
    });
  });

  it('returns Series details with entry summaries', () => {
    const repository = new MockLibraryRepositoryAdapter();

    const series = repository.getSeries('series-1');

    expect(series?.entries.map((entry) => entry.displayTitle)).toEqual([
      'Chapter 1: The Brass Door',
      'Chapter 2: Index of Ash',
    ]);
  });

  it('returns null for unknown entries', () => {
    const repository = new MockLibraryRepositoryAdapter();

    expect(repository.getEntry('series-1', 'missing-entry')).toBeNull();
  });

  it('returns null for unknown Series', () => {
    const repository = new MockLibraryRepositoryAdapter();

    expect(repository.getSeries('missing-series')).toBeNull();
    expect(repository.getEntry('missing-series', 'entry-1')).toBeNull();
  });
});
