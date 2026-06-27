import { Routes } from '@angular/router';
import { provideLibrary } from '../infrastructure/provide-library';

export const routes: Routes = [
  {
    path: '',
    providers: [provideLibrary()],
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
        path: 'series/:seriesId/entries/:entryId',
        loadComponent: () =>
          import('./pages/entry-reader/library-entry-reader.page').then(
            (module) => module.LibraryEntryReaderPage,
          ),
      },
    ],
  },
];
