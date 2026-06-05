import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { OrdersService } from '../../core/services/orders.service';

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

      <!-- Link a past guest order -->
      <div class="mt-12 pt-8 border-t border-ink-200">
        <h2 class="text-2xl font-light tracking-tight mb-2">Link a past order</h2>
        <p class="text-sm text-ink-500 mb-6 max-w-lg">
          Ordered as a guest? Add it to your account with the order number and the email you used at
          checkout. (Orders placed with this account's email are linked automatically.)
        </p>

        @if (claimMsg()) {
          <div
            class="mb-4 px-4 py-3 text-sm rounded"
            [class.bg-ink]="claimOk()"
            [class.text-paper]="claimOk()"
            [class.bg-ink-100]="!claimOk()"
            [class.text-ink]="!claimOk()"
          >
            {{ claimMsg() }}
            @if (claimOk()) {
              <a routerLink="/orders" class="link-underline ml-1">View in my orders →</a>
            }
          </div>
        }

        <div class="flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="text"
            [value]="claimOrderNumber()"
            (input)="claimOrderNumber.set($any($event.target).value)"
            placeholder="Order number (SZ-…)"
            class="input-clean tabular flex-1"
          />
          <input
            type="email"
            [value]="claimEmail()"
            (input)="claimEmail.set($any($event.target).value)"
            placeholder="Email used at checkout"
            class="input-clean flex-1"
          />
          <button
            (click)="claim()"
            [disabled]="!claimOrderNumber().trim() || !claimEmail().trim() || claiming()"
            class="btn-primary shrink-0"
          >
            {{ claiming() ? 'Linking…' : 'Link order' }}
          </button>
        </div>
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
  private readonly ordersService = inject(OrdersService);

  readonly claimOrderNumber = signal('');
  readonly claimEmail = signal('');
  readonly claiming = signal(false);
  readonly claimMsg = signal('');
  readonly claimOk = signal(false);

  claim(): void {
    const num = this.claimOrderNumber().trim();
    const mail = this.claimEmail().trim();
    if (!num || !mail) return;
    this.claiming.set(true);
    this.claimMsg.set('');
    this.ordersService.claimOrder(num, mail).subscribe({
      next: () => {
        this.claiming.set(false);
        this.claimOk.set(true);
        this.claimMsg.set(`Order ${num} linked to your account.`);
        this.claimOrderNumber.set('');
        this.claimEmail.set('');
      },
      error: (err) => {
        this.claiming.set(false);
        this.claimOk.set(false);
        this.claimMsg.set(
          err?.error?.error ?? 'Could not link that order. Check the number and email.',
        );
      },
    });
  }

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
    { label: 'Addresses', desc: 'Manage your shipping addresses', route: '/account/addresses' },
    { label: 'Settings', desc: 'Preferences and password', route: '/account' },
  ];
}
