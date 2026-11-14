import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { Role } from './domain';
import { Store } from './store';
import { Home } from './public/home';

const access =
  (...roles: Role[]): CanActivateFn =>
  (_route, state) => {
    const store = inject(Store);
    const router = inject(Router);
    if (!store.user())
      return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
    return store.canAccess(...roles) ? true : router.createUrlTree(['/profile']);
  };

const signedOut: CanActivateFn = () =>
  inject(Store).user() ? inject(Router).createUrlTree(['/profile']) : true;

export const routes: Routes = [
  { path: '', component: Home, title: 'CodeMart · Coding bootcamp & digital store' },
  {
    path: 'cohorts',
    loadComponent: () => import('./public/cohorts').then((page) => page.Cohorts),
    title: 'Cohorts · CodeMart',
  },
  {
    path: 'store',
    loadComponent: () => import('./public/catalog').then((page) => page.Catalog),
    title: 'Digital store · CodeMart',
  },
  {
    path: 'bag',
    loadComponent: () => import('./student/bag').then((page) => page.Bag),
    title: 'Shopping bag · CodeMart',
  },
  {
    path: 'login',
    canActivate: [signedOut],
    loadComponent: () => import('./public/auth').then((page) => page.Auth),
    title: 'Log in · CodeMart',
  },
  {
    path: 'signup',
    canActivate: [signedOut],
    loadComponent: () => import('./public/auth').then((page) => page.Auth),
    title: 'Create your account · CodeMart',
  },
  {
    path: 'profile',
    canActivate: [access('student', 'admin', 'accountant')],
    loadComponent: () => import('./student/profile').then((page) => page.Profile),
    title: 'Profile · CodeMart',
  },
  {
    path: 'student',
    canActivate: [access('student')],
    loadComponent: () => import('./student/learning').then((page) => page.Learning),
    title: 'My learning · CodeMart',
  },
  {
    path: 'office',
    canActivate: [access('admin', 'accountant')],
    loadComponent: () => import('./office/office').then((page) => page.Office),
    title: 'Finance · CodeMart',
  },
  { path: '**', redirectTo: '' },
];
