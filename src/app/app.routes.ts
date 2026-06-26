import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./app-tabs.component').then((module) => module.AppTabsComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'library',
      },
      {
        path: 'library',
        loadChildren: () =>
          import('./features/library/presentation/library.routes').then((module) => module.routes),
      },
      {
        path: 'explore',
        loadChildren: () =>
          import('./features/explore/presentation/explore.routes').then((module) => module.routes),
      },
      {
        path: 'more',
        loadChildren: () =>
          import('./features/more/presentation/more.routes').then((module) => module.routes),
      },
    ],
  },
];
