import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/explore.page').then((module) => module.ExplorePage),
  },
];
