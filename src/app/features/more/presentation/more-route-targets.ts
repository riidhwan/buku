import { routeTarget } from '@core/routing/route-target';

export const moreRouteTargets = {
  menu: () => routeTarget(['/more']),
  appUpdate: () => routeTarget(['/more', 'app-update']),
};
