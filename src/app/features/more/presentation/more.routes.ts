import { Routes } from '@angular/router';
import { provideMore } from '../infrastructure/provide-more';

export const routes: Routes = [
  {
    path: '',
    providers: [provideMore()],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/more.page').then((module) => module.MorePage),
      },
      {
        path: 'app-update',
        loadComponent: () =>
          import('./pages/app-update/app-update.page').then((module) => module.AppUpdatePage),
      },
    ],
  },
];
