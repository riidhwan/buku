import { routeTarget } from '@core/routing/route-target';

export const libraryRouteTargets = {
  home: () => routeTarget(['/library']),
  seriesDetail: (target: LibrarySeriesRouteTarget) =>
    routeTarget(['/library', 'series', target.seriesId]),
  entryReader: (target: LibrarySeriesEntryRouteTarget) =>
    routeTarget(['/library', 'series', target.seriesId, 'entries', target.entryId]),
  entryEdit: (target: LibrarySeriesEntryRouteTarget) =>
    routeTarget(['/library', 'series', target.seriesId, 'entries', target.entryId, 'edit']),
};

export interface LibrarySeriesRouteTarget {
  readonly seriesId: string;
}

export interface LibrarySeriesEntryRouteTarget extends LibrarySeriesRouteTarget {
  readonly entryId: string;
}
