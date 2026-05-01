import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <a routerLink="/" class="flex items-center gap-2 text-indigo-600 font-bold text-xl">
            <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M2 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M9 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z"
              />
            </svg>
            ShopZone
          </a>

          <!-- Desktop Nav -->
          <div class="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a
              routerLink="/"
              routerLinkActive="text-indigo-600"
              [routerLinkActiveOptions]="{ exact: true }"
              class="hover:text-indigo-600 transition-colors"
              >Home</a
            >
            <a
              routerLink="/products"
              routerLinkActive="text-indigo-600"
              class="hover:text-indigo-600 transition-colors"
              >Products</a
            >
            @if (auth.isAdmin()) {
              <a
                routerLink="/admin"
                routerLinkActive="text-indigo-600"
                class="hover:text-indigo-600 transition-colors"
                >Admin</a
              >
            }
          </div>

          <!-- Right Actions -->
          <div class="flex items-center gap-3">
            @if (auth.isAuthenticated()) {
              <!-- Cart Icon -->
              <button class="relative p-2 text-gray-500 hover:text-indigo-600 transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9M9 21a1 1 0 100-2 1 1 0 000 2zm10 0a1 1 0 100-2 1 1 0 000 2z"
                  />
                </svg>
              </button>

              <!-- User Menu -->
              <div class="relative">
                <button
                  (click)="toggleMenu()"
                  class="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600 transition-colors"
                >
                  <div
                    class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-600 text-xs"
                  >
                    {{ initials() }}
                  </div>
                  <span class="hidden sm:block">{{ auth.currentUser()?.name }}</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                @if (menuOpen()) {
                  <div
                    class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50"
                    (click)="closeMenu()"
                  >
                    <a
                      routerLink="/account"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      My Account
                    </a>
                    <a
                      routerLink="/account/orders"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Orders
                    </a>
                    <hr class="my-1 border-gray-100" />
                    <button
                      (click)="auth.logout()"
                      class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </div>
                }
              </div>
            } @else {
              <a
                routerLink="/auth/login"
                class="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
              >
                Sign In
              </a>
              <a
                routerLink="/auth/register"
                class="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Get Started
              </a>
            }
          </div>
        </div>
      </div>
    </nav>

    <!-- Overlay to close menu -->
    @if (menuOpen()) {
      <div class="fixed inset-0 z-40" (click)="closeMenu()"></div>
    }
  `,
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly menuOpen = signal(false);

  readonly initials = () => {
    const name = this.auth.currentUser()?.name ?? '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }
  closeMenu() {
    this.menuOpen.set(false);
  }
}
