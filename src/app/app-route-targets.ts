import { routeTarget } from '@core/routing/route-target';

export const appRouteTargets = {
  library: () => routeTarget(['/library']),
  explore: () => routeTarget(['/explore']),
  more: () => routeTarget(['/more']),
};
