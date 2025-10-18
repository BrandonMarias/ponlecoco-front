import { Routes } from '@angular/router';
import { authGuard } from '../auth/auth.guard';

const triviaPartyRoutes: Routes = [
  {
    path: 'create',
    loadComponent: () => import('./create-triviaparty/create-triviaparty.component'),
    canActivate: [authGuard],
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./create-triviaparty/create-triviaparty.component'),
    canActivate: [authGuard],
  }
];

export default triviaPartyRoutes;
