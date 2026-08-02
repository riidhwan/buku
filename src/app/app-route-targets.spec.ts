import { appRouteTargets } from './app-route-targets';

describe('appRouteTargets', () => {
  it('builds top-level tab route targets', () => {
    expect(appRouteTargets.library()).toEqual({ commands: ['/library'], url: '/library' });
    expect(appRouteTargets.explore()).toEqual({ commands: ['/explore'], url: '/explore' });
    expect(appRouteTargets.more()).toEqual({ commands: ['/more'], url: '/more' });
  });
});
