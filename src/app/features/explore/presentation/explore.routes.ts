import { Routes } from '@angular/router';
import { provideExplore } from '../infrastructure/provide-explore';

export const routes: Routes = [
  {
    path: '',
    providers: [provideExplore()],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/browser/explore-browser.page').then(
            (module) => module.ExploreBrowserPage,
          ),
      },
      {
        path: 'browser/tabs',
        loadComponent: () =>
          import('./pages/browser-tabs/explore-browser-tabs.page').then(
            (module) => module.ExploreBrowserTabsPage,
          ),
      },
      {
        path: 'browser',
        redirectTo: '',
        pathMatch: 'full',
      },
      {
        path: 'reader',
        redirectTo: '',
        pathMatch: 'full',
      },
    ],
  },
];
