import { Routes } from '@angular/router';
import { authGuard } from '../auth/auth.guard';

const rouletteRoutes: Routes = [
  {
    path: 'create',
    loadComponent: () => import('./create-roulette/create-roulette.component').then(m => m.default),
    canActivate: [authGuard],
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./create-roulette/create-roulette.component').then(m => m.default),
    canActivate: [authGuard],
  }
];

export default rouletteRoutes;
