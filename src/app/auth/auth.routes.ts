import { Routes } from '@angular/router';
import { loginGuard } from './login.guard';

const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component'),
    canActivate: [loginGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./register/register.component'),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];

export default authRoutes;
