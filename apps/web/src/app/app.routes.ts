import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  // --- Main layout (navbar + footer) ---
  {
    path: '',
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
        title: 'ShopZone — Home',
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/catalog/catalog.component').then((m) => m.CatalogComponent),
        title: 'Products — ShopZone',
      },
      {
        path: 'products/:slug',
        loadComponent: () =>
          import('./features/product/product-detail.component').then(
            (m) => m.ProductDetailComponent,
          ),
        title: 'ShopZone',
      },
      {
        path: 'wishlist',
        loadComponent: () =>
          import('./features/wishlist/wishlist.component').then((m) => m.WishlistComponent),
        canActivate: [authGuard],
        title: 'My Wishlist — ShopZone',
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./features/account/account.component').then((m) => m.AccountComponent),
        canActivate: [authGuard],
        title: 'My Account',
      },
      // Admin (placeholder — expanded in Phase 5)
      {
        path: 'admin',
        canActivate: [authGuard, adminGuard],
        loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
        title: 'Admin Dashboard',
      },
    ],
  },

  // --- Auth layout (centered, no navbar) ---
  {
    path: 'auth',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then((m) => m.LoginComponent),
        title: 'Sign In — ShopZone',
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
        title: 'Create Account — ShopZone',
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: '' },
];
