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
    path: 'verify-email',
    loadComponent: () => import('./email-verification/email-verification.component'),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password.component'),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./reset-password/reset-password.component'),
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('../legal/privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent),
  },
  {
    path: 'terms-of-service',
    loadComponent: () => import('../legal/terms-of-service/terms-of-service.component').then(m => m.TermsOfServiceComponent),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];

export default authRoutes;
