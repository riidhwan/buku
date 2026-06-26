import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/more.page').then((module) => module.MorePage),
  },
];
