import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, TitleCasePipe } from '@angular/common';
import { OrdersService, OrderDetail } from '../../core/services/orders.service';
import { AuthService } from '../../core/services/auth.service';

/**
 * Post-checkout confirmation, reachable without an account. Logged-in users load
 * their order directly; guests load it via the public email-gated lookup (the email
 * is carried over from checkout, or entered here — this doubles as an order-lookup page).
 */
@Component({
  selector: 'app-order-confirmation',
  imports: [RouterLink, CurrencyPipe, TitleCasePipe],
  template: `
    @if (loading()) {
      <div class="container-edge py-16 animate-pulse space-y-4 max-w-3xl">
        <div class="h-8 bg-ink-100 w-1/3"></div>
        <div class="h-40 bg-ink-100"></div>
      </div>
    }

    @if (!loading() && order(); as o) {
      <div class="bg-ink text-paper">
        <div class="container-edge py-5 max-w-3xl">
          <p class="text-base">
            @if (o.paymentStatus === 'paid') {
              Payment received. Thank you — we'll notify you when your order ships.
            } @else {
              Order placed. You'll pay in cash on delivery. Thank you!
            }
          </p>
        </div>
      </div>

      <section class="container-edge pt-16 pb-24 max-w-3xl">
        <p class="label mb-3">Order confirmed</p>
        <h1 class="text-4xl md:text-5xl font-light tracking-tighter">
          {{ o.orderNumber }}
        </h1>
        <div class="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-500">
          <span>Status: {{ o.status | titlecase }}</span>
          <span>Payment: {{ o.paymentStatus | titlecase }}</span>
        </div>

        <div class="mt-12 divide-y divide-ink-200 border-y border-ink-200">
          @for (item of o.items; track item.id) {
            <div class="py-4 flex items-baseline justify-between gap-4">
              <div class="min-w-0">
                <p class="text-base leading-snug">{{ item.productNameSnapshot }}</p>
                <p class="text-sm text-ink-400 tabular mt-0.5">Qty {{ item.qty }}</p>
              </div>
              <span class="text-sm tabular shrink-0">
                {{ +item.lineTotal | currency: 'INR' : 'symbol' : '1.2-2' }}
              </span>
            </div>
          }
        </div>

        <div class="mt-6 space-y-2">
          @if (+o.discount > 0) {
            <div class="flex justify-between text-sm">
              <span class="text-ink-500">Discount</span>
              <span class="tabular">−{{ +o.discount | currency: 'INR' : 'symbol' : '1.2-2' }}</span>
            </div>
          }
          <div class="flex justify-between items-baseline">
            <span class="text-sm">Total</span>
            <span class="text-2xl font-light tabular">
              {{ +o.total | currency: 'INR' : 'symbol' : '1.2-2' }}
            </span>
          </div>
        </div>

        <div class="mt-12 flex items-center gap-8">
          <a routerLink="/products" class="btn-primary">Continue shopping</a>
          @if (auth.isAuthenticated()) {
            <a
              [routerLink]="['/orders', o.id]"
              class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
              >View in my orders →</a
            >
          }
        </div>
      </section>
    }

    <!-- Guest lookup form (when no email is available yet, or lookup failed) -->
    @if (!loading() && !order()) {
      <section class="container-edge pt-20 pb-24 max-w-md">
        <p class="label mb-3">Order lookup</p>
        <h1 class="text-3xl font-light tracking-tighter mb-3">Find your order</h1>
        <p class="text-sm text-ink-500 mb-8">
          Enter the email you used at checkout to view this order.
        </p>

        @if (error()) {
          <div class="mb-4 bg-ink-100 px-4 py-3 text-sm text-ink rounded">{{ error() }}</div>
        }

        <div class="space-y-4">
          <input
            type="email"
            [value]="email()"
            (input)="email.set($any($event.target).value)"
            (keydown.enter)="lookup()"
            placeholder="you@example.com"
            class="input-clean"
          />
          <button (click)="lookup()" [disabled]="!email().trim()" class="btn-primary w-full">
            View order
          </button>
        </div>
      </section>
    }
  `,
})
export class OrderConfirmationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly ordersService = inject(OrdersService);
  readonly auth = inject(AuthService);

  readonly order = signal<OrderDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly email = signal('');

  private readonly orderId = computed(() => this.route.snapshot.paramMap.get('id') ?? '');

  ngOnInit(): void {
    const id = this.orderId();
    if (!id) {
      this.loading.set(false);
      return;
    }

    if (this.auth.isAuthenticated()) {
      this.ordersService.getOrder(id).subscribe({
        next: (res) => {
          this.order.set(res.data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
      return;
    }

    // Guest: use the email carried over from checkout (state) or remembered for reloads
    const navEmail =
      typeof history !== 'undefined' ? (history.state?.email as string | undefined) : undefined;
    const stateEmail = navEmail ?? this.rememberedEmail(id);
    if (stateEmail) {
      this.email.set(stateEmail);
      this.loadGuest(stateEmail);
    } else {
      this.loading.set(false);
    }
  }

  lookup(): void {
    const value = this.email().trim();
    if (!value) return;
    this.loading.set(true);
    this.error.set('');
    this.loadGuest(value);
  }

  private loadGuest(email: string): void {
    const id = this.orderId();
    this.ordersService.getGuestOrder(id, email).subscribe({
      next: (res) => {
        this.order.set(res.data);
        this.rememberEmail(id, email);
        this.loading.set(false);
      },
      error: () => {
        this.order.set(null);
        this.error.set('No order found for that email. Please check and try again.');
        this.loading.set(false);
      },
    });
  }

  private rememberEmail(id: string, email: string): void {
    try {
      sessionStorage.setItem(`guestOrderEmail:${id}`, email);
    } catch {
      // sessionStorage unavailable (SSR / privacy mode) — non-fatal
    }
  }

  private rememberedEmail(id: string): string | undefined {
    try {
      return sessionStorage.getItem(`guestOrderEmail:${id}`) ?? undefined;
    } catch {
      return undefined;
    }
  }
}
