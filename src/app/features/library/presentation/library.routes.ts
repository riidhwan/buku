import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/library.page').then((module) => module.LibraryPage),
  },
];
