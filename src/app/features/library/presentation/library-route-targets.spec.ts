import { libraryRouteTargets } from './library-route-targets';

describe('libraryRouteTargets', () => {
  it('builds Library route targets', () => {
    expect(libraryRouteTargets.home()).toEqual({ commands: ['/library'], url: '/library' });
    expect(libraryRouteTargets.seriesDetail({ seriesId: 'series-1' })).toEqual({
      commands: ['/library', 'series', 'series-1'],
      url: '/library/series/series-1',
    });
    expect(libraryRouteTargets.entryReader({ seriesId: 'series-1', entryId: 'entry-1' })).toEqual({
      commands: ['/library', 'series', 'series-1', 'entries', 'entry-1'],
      url: '/library/series/series-1/entries/entry-1',
    });
    expect(libraryRouteTargets.entryEdit({ seriesId: 'series-1', entryId: 'entry-1' })).toEqual({
      commands: ['/library', 'series', 'series-1', 'entries', 'entry-1', 'edit'],
      url: '/library/series/series-1/entries/entry-1/edit',
    });
  });

  it('encodes dynamic segments in URL strings', () => {
    expect(libraryRouteTargets.entryReader({ seriesId: 'series/1', entryId: 'entry#1' })).toEqual({
      commands: ['/library', 'series', 'series/1', 'entries', 'entry#1'],
      url: '/library/series/series%2F1/entries/entry%231',
    });
  });
});
