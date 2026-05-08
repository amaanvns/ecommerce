import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-account',
  imports: [RouterLink],
  template: `
    <section class="container-edge pt-20 pb-12 lg:pt-28 lg:pb-16 max-w-5xl">
      <h1 class="text-4xl md:text-5xl font-light tracking-tighter">Hello, {{ firstName() }}.</h1>
      <p class="mt-3 text-ink-500">{{ auth.currentUser()?.email }}</p>
      @if (isAdmin()) {
        <span class="mt-4 inline-block text-sm text-ink-500">Administrator</span>
      }
    </section>

    <div class="container-edge pb-24 max-w-5xl">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        @for (item of menuItems; track item.label) {
          <a
            [routerLink]="item.route"
            class="group block p-7 bg-ink-50/60 hover:bg-ink-50 transition-colors rounded-lg"
          >
            <div class="flex justify-between items-start">
              <div>
                <p class="text-lg text-ink">{{ item.label }}</p>
                <p class="text-sm text-ink-500 mt-1">{{ item.desc }}</p>
              </div>
              <span class="text-ink-400 group-hover:text-ink transition-colors">→</span>
            </div>
          </a>
        }
      </div>

      <div class="mt-12 pt-8 border-t border-ink-200 flex justify-end">
        <button
          (click)="auth.logout()"
          class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
        >
          Sign out
        </button>
      </div>
    </div>
  `,
})
export class AccountComponent {
  readonly auth = inject(AuthService);

  firstName(): string {
    return (this.auth.currentUser()?.name ?? '').split(' ')[0];
  }

  isAdmin(): boolean {
    const role = this.auth.currentUser()?.role;
    return role === 'admin' || role === 'super_admin';
  }

  readonly menuItems = [
    { label: 'Orders', desc: 'Track and manage your orders', route: '/orders' },
    { label: 'Saved items', desc: 'Products you saved for later', route: '/wishlist' },
    { label: 'Addresses', desc: 'Manage your shipping addresses', route: '/account' },
    { label: 'Settings', desc: 'Preferences and password', route: '/account' },
  ];
}
