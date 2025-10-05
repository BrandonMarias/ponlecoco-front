import { Routes } from '@angular/router';
import { authGuard } from '../auth/auth.guard';

const jeopardyRoutes: Routes = [
  {
    path: 'create',
    loadComponent: () => import('./create-jeopardy/create-jeopardy.component'),
    canActivate: [authGuard],
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./create-jeopardy/create-jeopardy.component'),
    canActivate: [authGuard],
  }
];

export default jeopardyRoutes;
