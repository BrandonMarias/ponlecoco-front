import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { CanDeactivateGameGuard } from './game-play/can-deactivate-game.guard';

export const routes: Routes = [
  // Public routes - NO GUARDS, estas deben estar PRIMERO y sin ninguna protección
  {
    path: 'public',
    children: [
      {
        path: 'triviaparty/:id',
        loadComponent: () => import('./public/public-triviaparty/public-triviaparty.component'),
      },
      {
        path: 'roulette/:id',
        loadComponent: () => import('./public/public-roulette/public-roulette.component'),
      },
      {
        path: 'play/:id',
        loadComponent: () => import('./game-play/game-play.component'),
      },
      {
        path: 'play-roulette/:id',
        loadComponent: () => import('./roulette-game/roulette-game.component').then(m => m.RouletteGameComponent),
      }
    ]
  },
  // Auth routes
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.routes'),
  },
  // Protected routes
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component'),
    canActivate: [authGuard],
  },
  {
    path: 'profile',
    loadComponent: () => import('./user-profile/user-profile.component'),
    canActivate: [authGuard],
  },
  {
    path: 'triviaparty',
    loadChildren: () => import('./triviaparty/triviaparty.routes'),
    canActivate: [authGuard],
  },
  {
    path: 'roulette',
    loadChildren: () => import('./roulette/roulette.routes'),
    canActivate: [authGuard],
  },
  {
    path: 'play/:id',
    loadComponent: () => import('./game-play/game-play.component'),
    canActivate: [authGuard],
    canDeactivate: [CanDeactivateGameGuard],
  },
  {
    path: 'play-roulette/:id',
    loadComponent: () => import('./roulette-game/roulette-game.component').then(m => m.RouletteGameComponent),
    canActivate: [authGuard],
  },
  // Root redirect
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  // Wildcard - debe estar ÚLTIMO
  {
    path: '**',
    redirectTo: 'auth/login'
  }
];



