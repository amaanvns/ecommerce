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
        title: 'Star Enterprises — Home',
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/catalog/catalog.component').then((m) => m.CatalogComponent),
        title: 'Products — Star Enterprises',
      },
      {
        path: 'products/:slug',
        loadComponent: () =>
          import('./features/product/product-detail.component').then(
            (m) => m.ProductDetailComponent,
          ),
        title: 'Star Enterprises',
      },
      {
        path: 'checkout',
        loadComponent: () =>
          import('./features/checkout/checkout.component').then((m) => m.CheckoutComponent),
        title: 'Checkout — Star Enterprises',
      },
      {
        path: 'order-confirmation/:id',
        loadComponent: () =>
          import('./features/orders/order-confirmation.component').then(
            (m) => m.OrderConfirmationComponent,
          ),
        title: 'Order Confirmed — Star Enterprises',
      },
      {
        path: 'track-order',
        loadComponent: () =>
          import('./features/orders/track-order.component').then((m) => m.TrackOrderComponent),
        title: 'Track Order — Star Enterprises',
      },
      // Policy & info pages — one content-driven component, content lives in info-page.component.ts
      ...(
        [
          ['shipping', 'Shipping Policy'],
          ['returns', 'Returns & Refunds'],
          ['privacy', 'Privacy Policy'],
          ['terms', 'Terms & Conditions'],
          ['faq', 'FAQ'],
          ['about', 'About Us'],
          ['contact', 'Contact Us'],
        ] as const
      ).map(([path, title]) => ({
        path,
        loadComponent: () =>
          import('./features/info/info-page.component').then((m) => m.InfoPageComponent),
        data: { page: path },
        title: `${title} — Star Enterprises`,
      })),
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/orders/orders.component').then((m) => m.OrdersComponent),
        canActivate: [authGuard],
        title: 'My Orders — Star Enterprises',
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./features/orders/order-detail.component').then((m) => m.OrderDetailComponent),
        canActivate: [authGuard],
        title: 'Order Details — Star Enterprises',
      },
      {
        path: 'wishlist',
        loadComponent: () =>
          import('./features/wishlist/wishlist.component').then((m) => m.WishlistComponent),
        title: 'My Wishlist — Star Enterprises',
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./features/account/account.component').then((m) => m.AccountComponent),
        canActivate: [authGuard],
        title: 'My Account',
      },
      {
        path: 'account/addresses',
        loadComponent: () =>
          import('./features/account/addresses.component').then((m) => m.AddressesComponent),
        canActivate: [authGuard],
        title: 'Addresses — Star Enterprises',
      },
    ],
  },

  // --- Admin layout (sidebar, no navbar/footer) ---
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./layouts/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
        title: 'Dashboard — Admin',
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/admin/orders/admin-orders.component').then(
            (m) => m.AdminOrdersComponent,
          ),
        title: 'Orders — Admin',
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/admin/products/admin-products.component').then(
            (m) => m.AdminProductsComponent,
          ),
        title: 'Products — Admin',
      },
      {
        path: 'products/new',
        loadComponent: () =>
          import('./features/admin/products/admin-product-form.component').then(
            (m) => m.AdminProductFormComponent,
          ),
        title: 'New Product — Admin',
      },
      {
        path: 'products/:id/edit',
        loadComponent: () =>
          import('./features/admin/products/admin-product-form.component').then(
            (m) => m.AdminProductFormComponent,
          ),
        title: 'Edit Product — Admin',
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/users/admin-users.component').then((m) => m.AdminUsersComponent),
        title: 'Users — Admin',
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./features/admin/reviews/admin-reviews.component').then(
            (m) => m.AdminReviewsComponent,
          ),
        title: 'Reviews — Admin',
      },
      {
        path: 'coupons',
        loadComponent: () =>
          import('./features/admin/coupons/admin-coupons.component').then(
            (m) => m.AdminCouponsComponent,
          ),
        title: 'Coupons — Admin',
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
        title: 'Sign In — Star Enterprises',
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
        title: 'Create Account — Star Enterprises',
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: '' },
];
