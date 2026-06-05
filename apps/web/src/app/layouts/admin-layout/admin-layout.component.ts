import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen lg:flex bg-paper text-ink">
      <!-- Mobile top bar -->
      <header
        class="lg:hidden sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-ink text-paper"
      >
        <button
          type="button"
          (click)="toggleDrawer()"
          class="text-paper/80 hover:text-paper transition-colors"
          aria-label="Open admin menu"
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
        <a routerLink="/admin" class="text-base tracking-[0.2em] uppercase">Studio</a>
        <a
          routerLink="/"
          class="text-2xs uppercase tracking-widest text-paper/60 hover:text-paper transition-colors"
        >
          Store
        </a>
      </header>

      <!-- Backdrop (mobile only) -->
      @if (drawerOpen()) {
        <div
          class="lg:hidden fixed inset-0 z-40 bg-ink/50 backdrop-blur-sm animate-fade-in"
          (click)="closeDrawer()"
          aria-hidden="true"
        ></div>
      }

      <!-- Sidebar — drawer on mobile, persistent on desktop -->
      <aside
        class="fixed lg:sticky top-0 z-50 lg:z-auto w-64 shrink-0 bg-ink text-paper flex flex-col h-screen transition-transform duration-300 lg:translate-x-0"
        [class.translate-x-0]="drawerOpen()"
        [class.-translate-x-full]="!drawerOpen()"
      >
        <div
          class="h-16 lg:h-20 flex items-center justify-between px-6 lg:px-8 border-b border-ink-700"
        >
          <a routerLink="/admin" class="text-lg lg:text-xl tracking-[0.3em] uppercase">Studio</a>
          <button
            type="button"
            (click)="closeDrawer()"
            class="lg:hidden text-paper/70 hover:text-paper transition-colors"
            aria-label="Close menu"
          >
            <svg
              width="20"
              height="20"
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

        <nav class="flex-1 py-8 px-4 space-y-1 overflow-y-auto" (click)="closeDrawer()">
          <a
            routerLink="/admin"
            routerLinkActive="bg-ink-800 text-paper"
            [routerLinkActiveOptions]="{ exact: true }"
            class="flex items-center justify-between px-4 py-3 text-2xs uppercase tracking-widest text-ink-200 hover:bg-ink-800 transition-colors"
          >
            <span>Overview</span>
            <span class="font-mono text-[10px] text-ink-400">01</span>
          </a>
          <a
            routerLink="/admin/orders"
            routerLinkActive="bg-ink-800 text-paper"
            class="flex items-center justify-between px-4 py-3 text-2xs uppercase tracking-widest text-ink-200 hover:bg-ink-800 transition-colors"
          >
            <span>Orders</span>
            <span class="font-mono text-[10px] text-ink-400">02</span>
          </a>
          <a
            routerLink="/admin/products"
            routerLinkActive="bg-ink-800 text-paper"
            class="flex items-center justify-between px-4 py-3 text-2xs uppercase tracking-widest text-ink-200 hover:bg-ink-800 transition-colors"
          >
            <span>Products</span>
            <span class="font-mono text-[10px] text-ink-400">03</span>
          </a>
          <a
            routerLink="/admin/users"
            routerLinkActive="bg-ink-800 text-paper"
            class="flex items-center justify-between px-4 py-3 text-2xs uppercase tracking-widest text-ink-200 hover:bg-ink-800 transition-colors"
          >
            <span>Customers</span>
            <span class="font-mono text-[10px] text-ink-400">04</span>
          </a>
          <a
            routerLink="/admin/reviews"
            routerLinkActive="bg-ink-800 text-paper"
            class="flex items-center justify-between px-4 py-3 text-2xs uppercase tracking-widest text-ink-200 hover:bg-ink-800 transition-colors"
          >
            <span>Reviews</span>
            <span class="font-mono text-[10px] text-ink-400">05</span>
          </a>
          <a
            routerLink="/admin/coupons"
            routerLinkActive="bg-ink-800 text-paper"
            class="flex items-center justify-between px-4 py-3 text-2xs uppercase tracking-widest text-ink-200 hover:bg-ink-800 transition-colors"
          >
            <span>Coupons</span>
            <span class="font-mono text-[10px] text-ink-400">06</span>
          </a>
        </nav>

        <div class="border-t border-ink-700 p-4 space-y-3">
          <a
            routerLink="/"
            class="flex items-center gap-2 px-4 py-2 text-2xs uppercase tracking-widest text-ink-300 hover:text-paper transition-colors"
          >
            ← Back to Store
          </a>
          <div class="px-4 py-2">
            <p class="text-2xs uppercase tracking-widest text-ink-400">Signed in as</p>
            <p class="text-xs text-ink-200 truncate mt-1">{{ auth.currentUser()?.email }}</p>
          </div>
        </div>
      </aside>

      <main class="flex-1 min-w-0">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AdminLayoutComponent {
  readonly auth = inject(AuthService);
  readonly drawerOpen = signal(false);

  toggleDrawer() {
    this.drawerOpen.update((v) => !v);
  }
  closeDrawer() {
    this.drawerOpen.set(false);
  }
}
