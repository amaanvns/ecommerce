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
            <svg
              width="28"
              height="28"
              class="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z"
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
                <svg
                  width="24"
                  height="24"
                  class="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="1.5"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
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
