import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { OrdersService, OrderDetail } from '../../core/services/orders.service';

@Component({
  selector: 'app-order-detail',
  imports: [RouterLink, CurrencyPipe, DatePipe, TitleCasePipe],
  template: `
    @if (loading()) {
      <div class="max-w-3xl mx-auto px-4 py-16 animate-pulse space-y-4">
        <div class="h-8 bg-gray-200 rounded w-1/3"></div>
        <div class="h-40 bg-gray-200 rounded-2xl"></div>
        <div class="h-24 bg-gray-200 rounded-2xl"></div>
      </div>
    }

    @if (!loading() && order()) {
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <!-- Success banner (shown after payment redirect) -->
        @if (isSuccess()) {
          <div class="mb-6 bg-green-50 border border-green-200 rounded-2xl p-5 flex gap-4">
            <div
              class="shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center"
            >
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                viewBox="0 0 24 24"
                class="text-green-600"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p class="font-semibold text-green-800">Payment successful!</p>
              <p class="text-sm text-green-700 mt-0.5">
                Your order has been confirmed. We'll notify you when it ships.
              </p>
            </div>
          </div>
        }

        <!-- Order header -->
        <div class="flex items-start justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">Order #{{ order()!.orderNumber }}</h1>
            <p class="text-sm text-gray-400 mt-1">
              Placed {{ order()!.placedAt | date: 'dd MMM yyyy, h:mm a' }}
            </p>
          </div>
          <div class="text-right">
            <span
              class="inline-block px-3 py-1 rounded-full text-xs font-semibold"
              [class]="statusClass(order()!.status)"
              >{{ order()!.status | titlecase }}</span
            >
            <p
              class="text-xs mt-1"
              [class]="order()!.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-500'"
            >
              {{ order()!.paymentStatus | titlecase }}
            </p>
          </div>
        </div>

        <!-- Order items -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4">
          <div class="px-6 py-4 border-b border-gray-50">
            <h2 class="text-sm font-semibold text-gray-700">Items Ordered</h2>
          </div>
          <div class="divide-y divide-gray-50">
            @for (item of order()!.items; track item.id) {
              <div class="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ item.productNameSnapshot }}</p>
                  @if (item.skuSnapshot) {
                    <p class="text-xs text-gray-400 mt-0.5">SKU: {{ item.skuSnapshot }}</p>
                  }
                  <p class="text-xs text-gray-500 mt-0.5">
                    {{ item.qty }} × {{ +item.unitPrice | currency: 'INR' : 'symbol' : '1.2-2' }}
                  </p>
                </div>
                <span class="text-sm font-semibold text-gray-900 shrink-0">
                  {{ +item.lineTotal | currency: 'INR' : 'symbol' : '1.2-2' }}
                </span>
              </div>
            }
          </div>
          <div class="px-6 py-4 border-t border-gray-100 space-y-1.5">
            <div class="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>{{ +order()!.subtotal | currency: 'INR' : 'symbol' : '1.2-2' }}</span>
            </div>
            <div class="flex justify-between text-sm text-gray-500">
              <span>Shipping</span>
              <span class="text-green-600">Free</span>
            </div>
            <div
              class="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-100"
            >
              <span>Total</span>
              <span>{{ +order()!.total | currency: 'INR' : 'symbol' : '1.2-2' }}</span>
            </div>
          </div>
        </div>

        <!-- Shipping address + Payment -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Shipping Address
            </h3>
            @let addr = order()!.shippingAddress;
            <p class="text-sm text-gray-700 font-medium">{{ addr['name'] }}</p>
            <p class="text-sm text-gray-500 mt-1">{{ addr['line1'] }}</p>
            @if (addr['line2']) {
              <p class="text-sm text-gray-500">{{ addr['line2'] }}</p>
            }
            <p class="text-sm text-gray-500">
              {{ addr['city'] }}, {{ addr['state'] }} {{ addr['postalCode'] }}
            </p>
            @if (addr['phone']) {
              <p class="text-sm text-gray-500 mt-1">{{ addr['phone'] }}</p>
            }
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Payment
            </h3>
            @if (order()!.payment) {
              <p class="text-sm font-medium text-gray-700 capitalize">
                {{ order()!.payment!.gateway }}
              </p>
              @if (order()!.payment!.gatewayRef) {
                <p class="text-xs text-gray-400 mt-0.5 font-mono">
                  {{ order()!.payment!.gatewayRef }}
                </p>
              }
              <p class="text-sm text-gray-500 mt-2">
                {{ +order()!.payment!.amount | currency: 'INR' : 'symbol' : '1.2-2' }}
                ·
                <span class="text-green-600 font-medium">{{
                  order()!.payment!.status | titlecase
                }}</span>
              </p>
            } @else {
              <p class="text-sm text-gray-400">No payment recorded</p>
            }
          </div>
        </div>

        <div class="flex gap-3">
          <a routerLink="/orders" class="text-sm text-indigo-600 hover:underline">← All Orders</a>
          <a
            routerLink="/products"
            class="text-sm text-gray-500 hover:text-indigo-600 transition-colors ml-auto"
            >Continue Shopping →</a
          >
        </div>
      </div>
    }

    @if (!loading() && !order()) {
      <div class="max-w-3xl mx-auto px-4 py-24 text-center text-gray-400">
        <p class="text-lg font-medium">Order not found</p>
        <a routerLink="/orders" class="mt-4 inline-block text-indigo-600 hover:underline text-sm"
          >View all orders</a
        >
      </div>
    }
  `,
})
export class OrderDetailComponent implements OnInit {
  private readonly ordersService = inject(OrdersService);
  private readonly route = inject(ActivatedRoute);

  readonly order = signal<OrderDetail | null>(null);
  readonly loading = signal(true);
  readonly isSuccess = signal(false);

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
