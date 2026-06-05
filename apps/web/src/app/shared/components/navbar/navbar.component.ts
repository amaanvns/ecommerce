import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header
      class="sticky top-0 z-40 bg-paper/85 backdrop-blur-md transition-all"
      [class.border-b]="scrolled()"
      [class.border-ink-200]="scrolled()"
    >
      <div class="container-edge">
        <div class="grid grid-cols-3 items-center h-16 sm:h-20">
          <!-- Left: desktop nav / mobile hamburger -->
          <nav class="hidden md:flex items-center gap-10 text-sm">
            <a
              routerLink="/products"
              routerLinkActive="text-ink"
              class="text-ink-500 hover:text-ink transition-colors"
              >Shop</a
            >
            <a
              routerLink="/products"
              [queryParams]="{ sort: 'newest' }"
              class="text-ink-500 hover:text-ink transition-colors"
              >New</a
            >
            <a routerLink="/products" class="text-ink-500 hover:text-ink transition-colors"
              >Stories</a
            >
            @if (auth.isAdmin()) {
              <a
                routerLink="/admin"
                routerLinkActive="text-ink"
                class="text-ink-500 hover:text-ink transition-colors"
                >Studio</a
              >
            }
          </nav>

          <button
            type="button"
            class="md:hidden justify-self-start text-ink-500 hover:text-ink transition-colors"
            (click)="toggleMobileNav()"
            [attr.aria-expanded]="mobileNavOpen()"
            aria-label="Open menu"
          >
            <svg
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>

          <!-- Centered wordmark -->
          <a
            routerLink="/"
            class="justify-self-center font-medium text-sm sm:text-base tracking-[0.2em] sm:tracking-[0.32em] uppercase text-ink whitespace-nowrap"
          >
            Shopzone
          </a>

          <!-- Right actions -->
          <div class="justify-self-end flex items-center gap-4 sm:gap-8 text-sm">
            <button
              type="button"
              class="hidden sm:block text-ink-500 hover:text-ink transition-colors"
              (click)="toggleSearch()"
              aria-label="Search"
            >
              Search
            </button>

            @if (auth.isAuthenticated()) {
              <a
                routerLink="/wishlist"
                class="hidden sm:block text-ink-500 hover:text-ink transition-colors"
                title="Saved"
              >
                Saved
              </a>

              <div class="relative hidden sm:block">
                <button
                  type="button"
                  (click)="toggleMenu()"
                  class="text-ink-500 hover:text-ink transition-colors"
                  [attr.aria-expanded]="menuOpen()"
                  aria-haspopup="menu"
                  aria-label="Account menu"
                >
                  Account
                </button>

                @if (menuOpen()) {
                  <div
                    class="absolute right-0 mt-4 w-56 bg-paper border border-ink-200 py-2 z-50 shadow-sm rounded-md"
                    (click)="closeMenu()"
                  >
                    <div class="px-5 pt-2 pb-3 border-b border-ink-100">
                      <p class="text-2xs uppercase tracking-widest text-ink-400">Signed in</p>
                      <p class="text-sm text-ink mt-1 truncate">{{ auth.currentUser()?.name }}</p>
                    </div>
                    <a
                      routerLink="/account"
                      class="block px-5 py-2.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
                      >My Account</a
                    >
                    <a
                      routerLink="/orders"
                      class="block px-5 py-2.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
                      >Orders</a
                    >
                    <a
                      routerLink="/wishlist"
                      class="block px-5 py-2.5 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
                      >Saved Items</a
                    >
                    <button
                      (click)="auth.logout()"
                      class="w-full text-left px-5 py-2.5 text-sm text-ink-500 hover:bg-ink-50 hover:text-ink transition-colors border-t border-ink-100 mt-1"
                    >
                      Sign Out
                    </button>
                  </div>
                }
              </div>
            } @else {
              <a
                routerLink="/auth/login"
                class="hidden sm:block text-ink-500 hover:text-ink transition-colors"
                >Sign In</a
              >
            }

            <button
              type="button"
              (click)="cartService.open()"
              class="text-ink-500 hover:text-ink transition-colors tabular"
              [attr.aria-label]="'Open bag, ' + cartService.count() + ' items'"
            >
              Bag <span class="text-ink-400" aria-hidden="true">({{ cartService.count() }})</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    @if (menuOpen()) {
      <div class="fixed inset-0 z-30" (click)="closeMenu()"></div>
    }

    <!-- Mobile nav drawer -->
    @if (mobileNavOpen()) {
      <div
        class="md:hidden fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm animate-fade-in"
        (click)="closeMobileNav()"
        aria-hidden="true"
      ></div>
      <nav
        class="md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[80vw] bg-paper flex flex-col animate-fade-in"
        aria-label="Main menu"
      >
        <div class="flex items-center justify-between h-16 px-6 border-b border-ink-200">
          <span class="font-medium text-sm tracking-[0.2em] uppercase">Menu</span>
          <button
            type="button"
            (click)="closeMobileNav()"
            class="text-ink-500 hover:text-ink transition-colors"
            aria-label="Close menu"
          >
            <svg
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="flex-1 overflow-y-auto py-4" (click)="closeMobileNav()">
          <a
            routerLink="/products"
            class="block px-6 py-3.5 text-base hover:bg-ink-50 transition-colors"
            >Shop</a
          >
          <a
            routerLink="/products"
            [queryParams]="{ sort: 'newest' }"
            class="block px-6 py-3.5 text-base hover:bg-ink-50 transition-colors"
            >New</a
          >
          <a
            routerLink="/products"
            class="block px-6 py-3.5 text-base hover:bg-ink-50 transition-colors"
            >Stories</a
          >
          @if (auth.isAuthenticated()) {
            <a
              routerLink="/wishlist"
              class="block px-6 py-3.5 text-base hover:bg-ink-50 transition-colors"
              >Saved</a
            >
            <a
              routerLink="/account"
              class="block px-6 py-3.5 text-base hover:bg-ink-50 transition-colors"
              >Account</a
            >
            <a
              routerLink="/orders"
              class="block px-6 py-3.5 text-base hover:bg-ink-50 transition-colors"
              >Orders</a
            >
            @if (auth.isAdmin()) {
              <a
                routerLink="/admin"
                class="block px-6 py-3.5 text-base hover:bg-ink-50 transition-colors"
                >Studio</a
              >
            }
          }
        </div>
        <div class="border-t border-ink-200 p-6">
          @if (auth.isAuthenticated()) {
            <button
              (click)="auth.logout(); closeMobileNav()"
              class="text-sm text-ink-500 hover:text-ink transition-colors"
            >
              Sign Out
            </button>
          } @else {
            <a routerLink="/auth/login" (click)="closeMobileNav()" class="btn-primary w-full"
              >Sign In</a
            >
          }
        </div>
      </nav>
    }
  `,
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly cartService = inject(CartService);
  readonly menuOpen = signal(false);
  readonly mobileNavOpen = signal(false);
  readonly scrolled = signal(false);

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 8);
  }

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }
  closeMenu() {
    this.menuOpen.set(false);
  }
  toggleMobileNav() {
    this.mobileNavOpen.update((v) => !v);
  }
  closeMobileNav() {
    this.mobileNavOpen.set(false);
  }
  toggleSearch() {
    /* hook for future search overlay */
  }
}
