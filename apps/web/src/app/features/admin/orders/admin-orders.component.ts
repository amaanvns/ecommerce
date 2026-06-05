import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminOrderRow, PaginatedMeta } from '../../../core/services/admin.service';

const ORDER_STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

@Component({
  selector: 'app-admin-orders',
  imports: [CurrencyPipe, DatePipe, TitleCasePipe, FormsModule],
  template: `
    <section class="border-b border-ink-200 bg-paper">
      <div
        class="px-4 sm:px-6 lg:px-10 py-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6"
      >
        <h1 class="text-4xl font-light tracking-tighter">Orders</h1>
        <div class="flex items-center gap-6">
          <select
            [(ngModel)]="statusFilter"
            (ngModelChange)="onStatusFilter()"
            class="bg-transparent border-0 border-b border-ink text-sm focus:ring-0 focus:outline-none cursor-pointer pr-8 py-2"
          >
            <option value="">All statuses</option>
            @for (s of statuses; track s) {
              <option [value]="s">{{ s | titlecase }}</option>
            }
          </select>
          <button (click)="exportCsv()" [disabled]="exporting()" class="btn-outline">
            {{ exporting() ? 'Exporting…' : 'Export CSV' }}
          </button>
        </div>
      </div>
    </section>

    <div class="px-4 sm:px-6 lg:px-10 py-10">
      @if (loading()) {
        <div class="space-y-px">
          @for (_ of [1, 2, 3, 4, 5]; track $index) {
            <div class="h-16 bg-ink-50 animate-pulse"></div>
          }
        </div>
      }

      @if (!loading()) {
        <div class="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table class="w-full min-w-[680px]">
            <thead>
              <tr class="border-b border-ink text-left">
                <th class="pb-3 pr-6 label">Order No.</th>
                <th class="pb-3 pr-6 label">Customer</th>
                <th class="pb-3 pr-6 label">Date</th>
                <th class="pb-3 pr-6 label">Payment</th>
                <th class="pb-3 pr-8 label text-right">Total</th>
                <th class="pb-3 label text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (order of orders(); track order.id) {
                <tr class="border-b border-ink-200 hover:bg-ink-50 transition-colors">
                  <td class="py-4 pr-6 font-mono text-xs whitespace-nowrap">
                    {{ order.orderNumber }}
                  </td>
                  <td class="py-4 pr-6">
                    <p class="text-sm leading-tight truncate max-w-[180px]">
                      {{ order.userName ?? '—' }}
                    </p>
                    <p class="text-xs text-ink-400 truncate max-w-[180px] mt-0.5">
                      {{ order.userEmail ?? '' }}
                    </p>
                  </td>
                  <td class="py-4 pr-6 text-sm text-ink-500 whitespace-nowrap">
                    {{ order.placedAt | date: 'dd MMM yyyy' }}
                  </td>
                  <td class="py-4 pr-6">
                    <span class="badge border" [class]="paymentClass(order.paymentStatus)">
                      {{ order.paymentStatus | titlecase }}
                    </span>
                  </td>
                  <td class="py-4 pr-8 font-mono text-sm text-right whitespace-nowrap">
                    {{ +order.total | currency: 'INR' : 'symbol' : '1.2-2' }}
                  </td>
                  <td class="py-4 text-right">
                    <select
                      [value]="order.status"
                      (change)="updateStatus(order, $any($event.target).value)"
                      [disabled]="updating() === order.id"
                      class="text-2xs uppercase tracking-widest border border-ink-200 px-3 py-2 bg-transparent focus:ring-0 focus:border-ink focus:outline-none disabled:opacity-50 cursor-pointer rounded"
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
                  <td colspan="6" class="py-16 text-center">
                    <p class="text-3xl font-light">No orders.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (meta(); as m) {
          @if (m.totalPages > 1) {
            <div class="flex items-center justify-between mt-8 pt-6 border-t border-ink-200">
              <span class="text-2xs uppercase tracking-widest text-ink-500"
                >{{ (m.page - 1) * m.limit + 1 }}–{{ min(m.page * m.limit, m.total) }} of
                {{ m.total }}</span
              >
              <div class="flex gap-6">
                <button
                  (click)="goToPage(m.page - 1)"
                  [disabled]="m.page === 1"
                  class="text-2xs uppercase tracking-widest hover:text-ink transition-colors disabled:opacity-30"
                >
                  ← Previous
                </button>
                <button
                  (click)="goToPage(m.page + 1)"
                  [disabled]="m.page === m.totalPages"
                  class="text-2xs uppercase tracking-widest hover:text-ink transition-colors disabled:opacity-30"
                >
                  Next →
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
  readonly exporting = signal(false);

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

  exportCsv(): void {
    this.exporting.set(true);
    this.adminService
      .exportOrdersCsv(this.statusFilter === 'paid' ? { status: 'paid' } : undefined)
      .subscribe({
        next: (blob) => {
          this.exporting.set(false);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
        error: () => this.exporting.set(false),
      });
  }

  paymentClass(status: string): string {
    if (status === 'paid') return 'border-ink bg-ink text-paper';
    if (status === 'pending') return 'border-ink-300 text-ink-500';
    if (status === 'refunded') return 'border-ink text-ink';
    return 'border-ink-300 text-ink-500';
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
