import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { OrdersService, Order } from '../../core/services/orders.service';

@Component({
  selector: 'app-orders',
  imports: [RouterLink, CurrencyPipe, DatePipe, TitleCasePipe],
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      @if (loading()) {
        <div class="space-y-3">
          @for (_ of [1, 2, 3]; track $index) {
            <div class="h-24 bg-gray-100 rounded-2xl animate-pulse"></div>
          }
        </div>
      }

      @if (!loading() && orders().length === 0) {
        <div class="text-center py-24 text-gray-400">
          <svg
            class="mx-auto mb-4 w-12 h-12"
            width="48"
            height="48"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
            />
          </svg>
          <p class="text-lg font-medium text-gray-500">No orders yet</p>
          <a
            routerLink="/products"
            class="mt-4 inline-block text-indigo-600 hover:underline text-sm"
            >Start shopping</a
          >
        </div>
      }

      @if (!loading() && orders().length > 0) {
        <div class="space-y-3">
          @for (order of orders(); track order.id) {
            <a
              [routerLink]="['/orders', order.id]"
              class="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="font-semibold text-gray-900">#{{ order.orderNumber }}</p>
                  <p class="text-sm text-gray-400 mt-0.5">
                    {{ order.placedAt | date: 'dd MMM yyyy' }}
                  </p>
                </div>
                <div class="text-right shrink-0">
                  <p class="font-bold text-gray-900">
                    {{ +order.total | currency: 'INR' : 'symbol' : '1.2-2' }}
                  </p>
                  <span
                    class="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                    [class]="statusClass(order.status)"
                    >{{ order.status | titlecase }}</span
                  >
                </div>
              </div>
              <div class="mt-3 flex items-center justify-between text-xs text-gray-400">
                <span
                  [class.text-green-600]="order.paymentStatus === 'paid'"
                  [class.text-orange-500]="order.paymentStatus === 'pending'"
                  [class.font-medium]="true"
                  >{{ order.paymentStatus | titlecase }}</span
                >
                <span class="text-indigo-600 font-medium">View details →</span>
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

  statusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      packed: 'bg-indigo-100 text-indigo-700',
      shipped: 'bg-purple-100 text-purple-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-600',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
  }
}
