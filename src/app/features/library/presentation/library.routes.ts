import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/library.page').then((module) => module.LibraryPage),
      },
      {
        path: 'series/:seriesId',
        loadComponent: () =>
          import('./pages/series-detail/library-series-detail.page').then(
            (module) => module.LibrarySeriesDetailPage,
          ),
      },
      {
        path: 'series/:seriesId/entries/:entryId/edit',
        loadComponent: () =>
          import('./pages/entry-edit/library-entry-edit.page').then(
            (module) => module.LibraryEntryEditPage,
          ),
      },
      {
        path: 'series/:seriesId/entries/:entryId',
        loadComponent: () =>
          import('./pages/entry-reader/library-entry-reader.page').then(
            (module) => module.LibraryEntryReaderPage,
          ),
      },
    ],
  },
];
