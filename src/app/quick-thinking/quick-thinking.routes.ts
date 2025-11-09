import { Routes } from '@angular/router';
import { authGuard } from '../auth/auth.guard';

const quickThinkingRoutes: Routes = [
  {
    path: 'create',
    loadComponent: () => import('./create-quick-thinking/create-quick-thinking.component'),
    canActivate: [authGuard],
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./create-quick-thinking/create-quick-thinking.component'),
    canActivate: [authGuard],
  },
  {
    path: 'lobby',
    loadComponent: () => import('./game-lobby/game-lobby.component'),
    canActivate: [authGuard],
  },
  {
    path: 'game-room/:roomToken',
    loadComponent: () => import('./game-room/game-room.component'),
    canActivate: [authGuard],
  },
];

export default quickThinkingRoutes;
