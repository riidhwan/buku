import { exploreRouteTargets } from './explore-route-targets';

describe('exploreRouteTargets', () => {
  it('builds Explore route targets', () => {
    expect(exploreRouteTargets.browser()).toEqual({
      commands: ['/explore'],
      url: '/explore',
    });
    expect(exploreRouteTargets.browserTabs()).toEqual({
      commands: ['/explore', 'browser', 'tabs'],
      url: '/explore/browser/tabs',
    });
  });
});
