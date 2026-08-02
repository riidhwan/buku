import { routeTarget } from '@core/routing/route-target';

export const exploreRouteTargets = {
  browser: () => routeTarget(['/explore']),
  browserTabs: () => routeTarget(['/explore', 'browser', 'tabs']),
};
