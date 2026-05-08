import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen flex bg-paper text-ink">
      <aside class="w-64 shrink-0 bg-ink text-paper flex flex-col sticky top-0 h-screen">
        <div class="h-20 flex items-center px-8 border-b border-ink-700">
          <a routerLink="/admin" class="text-xl tracking-[0.3em] uppercase"> Studio </a>
        </div>

        <nav class="flex-1 py-8 px-4 space-y-1">
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
}
