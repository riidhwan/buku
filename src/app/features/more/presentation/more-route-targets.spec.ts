import { moreRouteTargets } from './more-route-targets';

describe('moreRouteTargets', () => {
  it('builds More route targets', () => {
    expect(moreRouteTargets.menu()).toEqual({ commands: ['/more'], url: '/more' });
    expect(moreRouteTargets.appUpdate()).toEqual({
      commands: ['/more', 'app-update'],
      url: '/more/app-update',
    });
  });
});
