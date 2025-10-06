import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes'),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component'),
    canActivate: [authGuard],
  },
  {
    path: 'jeopardy',
    loadChildren: () => import('./jeopardy/jeopardy.routes'),
    canActivate: [authGuard], // Or apply to individual child routes
  },
  {
    path: 'play/:id',
    loadComponent: () => import('./game-play/game-play.component'),
    canActivate: [authGuard],
  },
  {
    path: '',
    redirectTo: 'dashboard', // Changed from 'auth' to 'dashboard'
    pathMatch: 'full',
  },
];



