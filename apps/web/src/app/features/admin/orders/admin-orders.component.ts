import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminOrderRow, PaginatedMeta } from '../../../core/services/admin.service';

const ORDER_STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

@Component({
  selector: 'app-admin-orders',
  imports: [CurrencyPipe, DatePipe, TitleCasePipe, FormsModule],
  template: `
    <div class="p-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Orders</h1>
        <select
          [(ngModel)]="statusFilter"
          (ngModelChange)="onStatusFilter()"
          class="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ s | titlecase }}</option>
          }
        </select>
      </div>

      @if (loading()) {
        <div class="space-y-2">
          @for (_ of [1, 2, 3, 4, 5]; track $index) {
            <div class="h-12 bg-gray-100 rounded-xl animate-pulse"></div>
          }
        </div>
      }

      @if (!loading()) {
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-100">
                <tr class="text-left text-xs text-gray-500">
                  <th class="px-4 py-3 font-semibold">Order #</th>
                  <th class="px-4 py-3 font-semibold">Customer</th>
                  <th class="px-4 py-3 font-semibold">Date</th>
                  <th class="px-4 py-3 font-semibold">Payment</th>
                  <th class="px-4 py-3 font-semibold">Total</th>
                  <th class="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                @for (order of orders(); track order.id) {
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td class="px-4 py-3 font-mono text-xs text-gray-600">
                      #{{ order.orderNumber }}
                    </td>
                    <td class="px-4 py-3">
                      <p class="font-medium text-gray-900 truncate max-w-[140px]">
                        {{ order.userName ?? '—' }}
                      </p>
                      <p class="text-xs text-gray-400 truncate max-w-[140px]">
                        {{ order.userEmail ?? '' }}
                      </p>
                    </td>
                    <td class="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {{ order.placedAt | date: 'dd MMM yyyy' }}
                    </td>
                    <td class="px-4 py-3">
                      <span
                        class="px-2 py-0.5 rounded-full text-xs font-semibold"
                        [class.bg-green-100]="order.paymentStatus === 'paid'"
                        [class.text-green-700]="order.paymentStatus === 'paid'"
                        [class.bg-yellow-100]="order.paymentStatus === 'pending'"
                        [class.text-yellow-700]="order.paymentStatus === 'pending'"
                        [class.bg-gray-100]="
                          order.paymentStatus !== 'paid' && order.paymentStatus !== 'pending'
                        "
                        [class.text-gray-600]="
                          order.paymentStatus !== 'paid' && order.paymentStatus !== 'pending'
                        "
                        >{{ order.paymentStatus | titlecase }}</span
                      >
                    </td>
                    <td class="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                      {{ +order.total | currency: 'INR' : 'symbol' : '1.2-2' }}
                    </td>
                    <td class="px-4 py-3">
                      <select
                        [value]="order.status"
                        (change)="updateStatus(order, $any($event.target).value)"
                        [disabled]="updating() === order.id"
                        class="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                        [class]="statusClass(order.status)"
                      >
                        @for (s of statuses; track s) {
                          <option [value]="s">{{ s | titlecase }}</option>
                        }
                      </select>
                    </td>
                  </tr>
                }
                @if (orders().length === 0) {
                  <tr>
                    <td colspan="6" class="px-4 py-12 text-center text-gray-400 text-sm">
                      No orders found
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination -->
        @if (meta(); as m) {
          @if (m.totalPages > 1) {
            <div class="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span
                >{{ (m.page - 1) * m.limit + 1 }}–{{ min(m.page * m.limit, m.total) }} of
                {{ m.total }}</span
              >
              <div class="flex gap-2">
                <button
                  (click)="goToPage(m.page - 1)"
                  [disabled]="m.page === 1"
                  class="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  (click)="goToPage(m.page + 1)"
                  [disabled]="m.page === m.totalPages"
                  class="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          }
        }
      }
    </div>
  `,
})
export class AdminOrdersComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly orders = signal<AdminOrderRow[]>([]);
  readonly meta = signal<PaginatedMeta | null>(null);
  readonly loading = signal(true);
  readonly updating = signal<string | null>(null);

  readonly statuses = ORDER_STATUSES;
  statusFilter = '';
  currentPage = 1;

  ngOnInit(): void {
    this.load();
  }

  onStatusFilter(): void {
    this.currentPage = 1;
    this.load();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminService.getOrders(this.currentPage, 20, this.statusFilter || undefined).subscribe({
      next: (res) => {
        this.orders.set(res.data);
        this.meta.set(res.meta);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  updateStatus(order: AdminOrderRow, status: string): void {
    if (order.status === status) return;
    this.updating.set(order.id);
    this.adminService.updateOrderStatus(order.id, status).subscribe({
      next: (res) => {
        this.orders.update((rows) =>
          rows.map((r) => (r.id === order.id ? { ...r, status: res.data.status } : r)),
        );
        this.updating.set(null);
      },
      error: () => this.updating.set(null),
    });
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700',
      confirmed: 'bg-blue-50 text-blue-700',
      packed: 'bg-indigo-50 text-indigo-700',
      shipped: 'bg-purple-50 text-purple-700',
      delivered: 'bg-green-50 text-green-700',
      cancelled: 'bg-red-50 text-red-600',
    };
    return map[status] ?? 'bg-gray-50 text-gray-600';
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
