import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { OrdersService, Order } from '../../core/services/orders.service';

@Component({
  selector: 'app-orders',
  imports: [RouterLink, CurrencyPipe, DatePipe, TitleCasePipe],
  template: `
    <section class="container-edge pt-20 pb-12 lg:pt-28 lg:pb-16 max-w-5xl">
      <h1 class="text-4xl md:text-5xl font-light tracking-tighter">Orders</h1>
      @if (orders().length > 0) {
        <p class="text-sm text-ink-500 mt-3 tabular">
          {{ orders().length }} {{ orders().length === 1 ? 'order' : 'orders' }}
        </p>
      }
    </section>

    <div class="container-edge pb-24 max-w-5xl">
      @if (loading()) {
        <div class="space-y-3">
          @for (_ of [1, 2, 3]; track $index) {
            <div class="h-24 bg-ink-50 animate-pulse rounded"></div>
          }
        </div>
      }

      @if (!loading() && orders().length === 0) {
        <div class="text-center py-32">
          <p class="text-3xl font-light tracking-tight mb-3">No orders yet</p>
          <p class="text-ink-500 mb-8">When you place an order it'll appear here.</p>
          <a routerLink="/products" class="btn-outline">Continue Shopping</a>
        </div>
      }

      @if (!loading() && orders().length > 0) {
        <div class="border-t border-ink-200">
          @for (order of orders(); track order.id) {
            <a
              [routerLink]="['/orders', order.id]"
              class="group grid grid-cols-12 items-center gap-6 py-7 border-b border-ink-200 hover:bg-ink-50/60 transition-colors px-4 -mx-4 rounded"
            >
              <div class="col-span-12 sm:col-span-3">
                <p class="text-base text-ink">{{ order.placedAt | date: 'dd MMM yyyy' }}</p>
                <p class="text-sm text-ink-400 mt-0.5 tabular">No. {{ order.orderNumber }}</p>
              </div>
              <div class="col-span-6 sm:col-span-3">
                <span class="text-sm" [class]="statusTextClass(order.status)">{{
                  order.status | titlecase
                }}</span>
              </div>
              <div class="col-span-6 sm:col-span-5 sm:text-right tabular text-base">
                {{ +order.total | currency: 'INR' : 'symbol' : '1.2-2' }}
              </div>
              <div class="hidden sm:block col-span-1 text-right">
                <span class="text-sm text-ink-400 group-hover:text-ink transition-colors">→</span>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class OrdersComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);

  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.ordersService.getOrders().subscribe({
      next: (res) => {
        this.orders.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusTextClass(status: string): string {
    if (status === 'cancelled') return 'text-ink-400';
    if (status === 'delivered') return 'text-ink';
    return 'text-ink-500';
  }
}
