import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { OrdersService, OrderDetail } from '../../core/services/orders.service';
import { CartService } from '../../core/services/cart.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const STATUS_STEPS = ['pending', 'confirmed', 'packed', 'shipped', 'delivered'] as const;

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, CurrencyPipe, DatePipe, TitleCasePipe],
  template: `
    @if (loading()) {
      <div class="container-edge py-16 animate-pulse space-y-4 max-w-4xl">
        <div class="h-8 bg-ink-100 w-1/3"></div>
        <div class="h-16 bg-ink-100"></div>
        <div class="h-40 bg-ink-100"></div>
      </div>
    }

    @if (!loading() && order()) {
      <!-- Success banner -->
      @if (isSuccess()) {
        <div class="bg-ink text-paper animate-fade-in">
          <div class="container-edge py-5 max-w-5xl">
            <p class="text-base">
              Payment received. Thank you — we'll notify you when your order ships.
            </p>
          </div>
        </div>
      }

      <!-- Header -->
      <section class="container-edge pt-16 pb-10 lg:pt-20 max-w-5xl">
        <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <h1 class="text-4xl md:text-5xl font-light tracking-tighter">Order details</h1>
            <p class="mt-3 text-sm text-ink-500 tabular">
              No. {{ order()!.orderNumber }} · Placed {{ order()!.placedAt | date: 'dd MMM yyyy' }}
            </p>
          </div>
          <div class="flex items-center gap-4 shrink-0">
            @if (canCancel()) {
              <button
                (click)="cancelOrder()"
                [disabled]="cancelling()"
                class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
              >
                {{ cancelling() ? 'Cancelling…' : 'Cancel order' }}
              </button>
            }
            <button (click)="reorder()" [disabled]="reordering()" class="btn-outline">
              {{ reordering() ? 'Adding…' : 'Re-order' }}
            </button>
          </div>
        </div>
      </section>

      <div class="container-edge pb-24 max-w-5xl">
        @if (reorderSuccess()) {
          <div
            class="mb-8 bg-ink-50 px-4 py-3 text-sm flex items-center justify-between animate-fade-in rounded"
          >
            <span>Items added to your bag.</span>
            <button (click)="cart.open()" class="link-underline text-sm">View bag →</button>
          </div>
        }

        <!-- Status stepper -->
        @if (order()!.status !== 'cancelled') {
          <div class="bg-ink-50/60 px-8 py-10 mb-12 rounded">
            <div class="flex items-center justify-between">
              @for (step of steps(); track step.key; let last = $last) {
                <div class="flex items-center" [class.flex-1]="!last">
                  <div class="flex flex-col items-center gap-3 shrink-0">
                    <div
                      class="w-10 h-10 rounded-full flex items-center justify-center text-sm tabular transition-all"
                      [class.bg-ink]="step.done"
                      [class.text-paper]="step.done"
                      [class.bg-ink-200]="!step.done"
                      [class.text-ink-400]="!step.done"
                    >
                      @if (step.done) {
                        ✓
                      } @else {
                        {{ $index + 1 }}
                      }
                    </div>
                    <span
                      class="text-sm hidden sm:block transition-colors"
                      [class.text-ink]="step.active || step.done"
                      [class.text-ink-400]="!step.active && !step.done"
                      >{{ step.label }}</span
                    >
                  </div>
                  @if (!last) {
                    <div
                      class="flex-1 h-px mx-3 transition-all"
                      [class.bg-ink]="step.done"
                      [class.bg-ink-200]="!step.done"
                    ></div>
                  }
                </div>
              }
            </div>
          </div>
        } @else {
          <div class="mb-12 bg-ink-50 px-6 py-5 rounded">
            <p class="text-base">This order was cancelled.</p>
            @if (order()!.paymentStatus === 'refunded') {
              <p class="text-sm text-ink-500 mt-1">A refund has been initiated.</p>
            }
          </div>
        }

        <!-- Items -->
        <div class="mb-16">
          <h2 class="text-xl font-light tracking-tight mb-6">Items</h2>
          <div class="border-t border-ink-200">
            @for (item of order()!.items; track item.id) {
              <div class="flex items-center justify-between gap-6 py-5 border-b border-ink-200">
                <div class="flex-1 min-w-0">
                  <p class="text-base">{{ item.productNameSnapshot }}</p>
                  <p class="text-sm text-ink-400 mt-1 tabular">
                    Qty {{ item.qty }} ×
                    {{ +item.unitPrice | currency: 'INR' : 'symbol' : '1.2-2' }}
                  </p>
                </div>
                <p class="tabular text-base shrink-0">
                  {{ +item.lineTotal | currency: 'INR' : 'symbol' : '1.2-2' }}
                </p>
              </div>
            }
          </div>

          <div class="mt-6 max-w-sm ml-auto space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-ink-500">Subtotal</span>
              <span class="tabular">{{
                +order()!.subtotal | currency: 'INR' : 'symbol' : '1.2-2'
              }}</span>
            </div>
            @if (+order()!.discount > 0) {
              <div class="flex justify-between text-sm">
                <span class="text-ink-500">Discount</span>
                <span class="tabular"
                  >−{{ +order()!.discount | currency: 'INR' : 'symbol' : '1.2-2' }}</span
                >
              </div>
            }
            <div class="flex justify-between text-sm">
              <span class="text-ink-500">Shipping</span>
              <span class="text-ink-500">Free</span>
            </div>
            <div class="pt-3 border-t border-ink-200 flex justify-between items-baseline">
              <span class="text-sm">Total</span>
              <span class="text-2xl font-light tabular">{{
                +order()!.total | currency: 'INR' : 'symbol' : '1.2-2'
              }}</span>
            </div>
          </div>
        </div>

        <!-- Address & Payment -->
        <div class="grid sm:grid-cols-2 gap-12 mb-12">
          <div>
            <h3 class="label mb-4">Shipping to</h3>
            @let addr = order()!.shippingAddress;
            <p class="text-base text-ink">{{ addr['name'] }}</p>
            <div class="text-sm text-ink-500 mt-1 space-y-0.5">
              <p>{{ addr['line1'] }}</p>
              @if (addr['line2']) {
                <p>{{ addr['line2'] }}</p>
              }
              <p>{{ addr['city'] }}, {{ addr['state'] }} {{ addr['postalCode'] }}</p>
              @if (addr['phone']) {
                <p class="tabular pt-1">{{ addr['phone'] }}</p>
              }
            </div>
          </div>

          <div>
            <h3 class="label mb-4">Payment</h3>
            @if (order()!.payment) {
              <p class="text-base capitalize">
                {{ order()!.payment!.gateway }} · {{ order()!.payment!.status | titlecase }}
              </p>
              <p class="text-sm text-ink-500 mt-1 tabular">
                {{ +order()!.payment!.amount | currency: 'INR' : 'symbol' : '1.2-2' }}
              </p>
              @if (order()!.payment!.gatewayRef) {
                <p class="text-sm text-ink-400 mt-1 tabular break-all">
                  Ref · {{ order()!.payment!.gatewayRef }}
                </p>
              }
            } @else {
              <p class="text-sm text-ink-400">No payment recorded</p>
            }
          </div>
        </div>

        <div class="flex justify-between items-center pt-8 border-t border-ink-200">
          <a
            routerLink="/orders"
            class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
            >← All orders</a
          >
          <a
            routerLink="/products"
            class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
            >Continue shopping →</a
          >
        </div>
      </div>
    }

    @if (!loading() && !order()) {
      <div class="container-edge py-32 text-center">
        <p class="text-3xl font-light tracking-tight mb-4">Order not found</p>
        <a routerLink="/orders" class="btn-outline">View all orders</a>
      </div>
    }
  `,
})
export class OrderDetailComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly route = inject(ActivatedRoute);
  readonly cart = inject(CartService);

  readonly order = signal<OrderDetail | null>(null);
  readonly loading = signal(true);
  readonly isSuccess = signal(false);
  readonly cancelling = signal(false);
  readonly reordering = signal(false);
  readonly reorderSuccess = signal(false);

  readonly canCancel = computed(() => {
    const s = this.order()?.status;
    return s === 'pending' || s === 'confirmed';
  });

  readonly steps = computed(() => {
    const current = this.order()?.status ?? 'pending';
    const currentIdx = STATUS_STEPS.indexOf(current as (typeof STATUS_STEPS)[number]);
    return STATUS_STEPS.map((key, i) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      done: i <= currentIdx,
      active: i === currentIdx,
    }));
  });

  ngOnInit(): void {
    this.isSuccess.set(this.route.snapshot.queryParamMap.get('success') === '1');
    const id = this.route.snapshot.paramMap.get('id')!;
    this.ordersService.getOrder(id).subscribe({
      next: (res) => {
        this.order.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.order.set(null);
        this.loading.set(false);
      },
    });
  }

  cancelOrder(): void {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    this.cancelling.set(true);
    this.ordersService.cancelOrder(this.order()!.id).subscribe({
      next: (res) => {
        this.order.update((o) =>
          o ? { ...o, status: res.data.status, paymentStatus: res.data.paymentStatus } : o,
        );
        this.cancelling.set(false);
      },
      error: () => this.cancelling.set(false),
    });
  }

  reorder(): void {
    const items = this.order()?.items ?? [];
    if (items.length === 0) return;
    this.reordering.set(true);

    const adds = items
      .filter((i) => !!i.variantId)
      .map((i) => this.cart.addItem(i.variantId!, i.qty).pipe(catchError(() => of(null))));

    forkJoin(adds).subscribe(() => {
      this.reordering.set(false);
      this.reorderSuccess.set(true);
      setTimeout(() => this.reorderSuccess.set(false), 4000);
    });
  }
}
