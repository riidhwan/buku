import { routeTarget } from './route-target';

describe('routeTarget', () => {
  it('returns router commands with an encoded URL string', () => {
    expect(routeTarget(['/library', 'series', 'series/1', 'entries', 'entry#1'])).toEqual({
      commands: ['/library', 'series', 'series/1', 'entries', 'entry#1'],
      url: '/library/series/series%2F1/entries/entry%231',
    });
  });

  it('supports relative route commands', () => {
    expect(routeTarget(['series', 1])).toEqual({
      commands: ['series', 1],
      url: 'series/1',
    });
  });

  it('throws when no route commands are provided', () => {
    expect(() => routeTarget([])).toThrowError('RouteTarget requires at least one command.');
  });
});
