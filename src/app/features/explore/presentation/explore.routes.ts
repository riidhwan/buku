import { Routes } from '@angular/router';
import { provideExplore } from '../infrastructure/provide-explore';

export const routes: Routes = [
  {
    path: '',
    providers: [provideExplore()],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/explore.page').then((module) => module.ExplorePage),
      },
      {
        path: 'browser',
        loadComponent: () =>
          import('./pages/browser/explore-browser.page').then(
            (module) => module.ExploreBrowserPage,
          ),
      },
    ],
  },
];
