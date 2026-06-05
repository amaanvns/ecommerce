import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { OrdersService } from '../../core/services/orders.service';

/**
 * Public "track your order" page for guests who checked out without an account.
 * They enter their order number + email; on success we hand off to the existing
 * order-confirmation page (carrying the email) which renders the order detail.
 */
@Component({
  selector: 'app-track-order',
  template: `
    <section class="container-edge pt-20 pb-24 max-w-md">
      <p class="label mb-3">Track your order</p>
      <h1 class="text-3xl md:text-4xl font-light tracking-tighter mb-3">Find your order</h1>
      <p class="text-sm text-ink-500 mb-8">
        Enter your order number and the email you used at checkout.
      </p>

      @if (error()) {
        <div class="mb-4 bg-ink-100 px-4 py-3 text-sm text-ink rounded">{{ error() }}</div>
      }

      <div class="space-y-5">
        <div>
          <label class="label-input">Order Number</label>
          <input
            type="text"
            [value]="orderNumber()"
            (input)="orderNumber.set($any($event.target).value)"
            (keydown.enter)="track()"
            placeholder="SZ-XXXXXXXX-XXXX"
            class="input-clean tabular"
          />
        </div>
        <div>
          <label class="label-input">Email</label>
          <input
            type="email"
            [value]="email()"
            (input)="email.set($any($event.target).value)"
            (keydown.enter)="track()"
            placeholder="you@example.com"
            class="input-clean"
          />
        </div>
        <button
          (click)="track()"
          [disabled]="!orderNumber().trim() || !email().trim() || loading()"
          class="btn-primary w-full"
        >
          {{ loading() ? 'Searching…' : 'Track order' }}
        </button>
      </div>
    </section>
  `,
})
export class TrackOrderComponent {
  private readonly ordersService = inject(OrdersService);
  private readonly router = inject(Router);

  readonly orderNumber = signal('');
  readonly email = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  track(): void {
    const num = this.orderNumber().trim();
    const mail = this.email().trim();
    if (!num || !mail) return;
    this.loading.set(true);
    this.error.set('');
    this.ordersService.trackGuestOrder(num, mail).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.router.navigate(['/order-confirmation', res.data.id], { state: { email: mail } });
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No order found. Please check your order number and email.');
      },
    });
  }
}
