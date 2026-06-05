import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  AdminService,
  AdminStats,
  CategorySalesRow,
  SalesTrendPoint,
  TopProductRow,
} from '../../../core/services/admin.service';
import {
  LineChartComponent,
  LineChartPoint,
} from '../../../shared/components/line-chart/line-chart.component';

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    TitleCasePipe,
    RouterLink,
    FormsModule,
    LineChartComponent,
  ],
  template: `
    <section class="border-b border-ink-200 bg-paper">
      <div
        class="px-4 sm:px-6 lg:px-10 py-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <h1 class="text-4xl font-light tracking-tighter">Dashboard</h1>
        <button (click)="exportOrders()" [disabled]="exporting()" class="btn-outline">
          {{ exporting() ? 'Exporting…' : 'Export orders CSV' }}
        </button>
      </div>
    </section>

    <div class="px-4 sm:px-6 lg:px-10 py-10 space-y-12">
      @if (loading()) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink-200 border border-ink-200">
          @for (_ of [1, 2, 3, 4]; track $index) {
            <div class="h-36 bg-paper animate-pulse"></div>
          }
        </div>
      }

      @if (!loading() && stats()) {
        <!-- KPI cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink-200 border border-ink-200">
          <div class="bg-paper p-8">
            <p class="label">Revenue</p>
            <p class="text-3xl font-light tracking-tight tabular mt-3">
              {{ stats()!.totalRevenue | currency: 'INR' : 'symbol' : '1.0-0' }}
            </p>
            <p class="text-sm text-ink-400 mt-2">All-time, paid orders</p>
          </div>
          <div class="bg-paper p-8">
            <p class="label">Orders</p>
            <p class="text-3xl font-light tracking-tight tabular mt-3">
              {{ stats()!.totalOrders }}
            </p>
            <p class="text-sm text-ink-400 mt-2">All time</p>
          </div>
          <div class="bg-paper p-8">
            <p class="label">Customers</p>
            <p class="text-3xl font-light tracking-tight tabular mt-3">
              {{ stats()!.totalUsers }}
            </p>
            <p class="text-sm text-ink-400 mt-2">Registered</p>
          </div>
          <div class="bg-paper p-8">
            <p class="label">Products</p>
            <p class="text-3xl font-light tracking-tight tabular mt-3">
              {{ stats()!.totalProducts }}
            </p>
            <p class="text-sm text-ink-400 mt-2">Active</p>
          </div>
        </div>

        <!-- Sales trend chart -->
        <section>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-2">
            <div>
              <h2 class="text-2xl font-light tracking-tight">Revenue trend</h2>
              <p class="text-sm text-ink-500 mt-1 tabular">
                Last {{ trendDays() }} days · paid orders ·
                <strong class="text-ink font-normal">{{
                  trendTotalRevenue() | currency: 'INR' : 'symbol' : '1.0-0'
                }}</strong>
                from
                <strong class="text-ink font-normal tabular">{{ trendTotalOrders() }}</strong>
                orders
              </p>
            </div>
            <select
              [(ngModel)]="trendDaysModel"
              (ngModelChange)="onTrendDaysChange($event)"
              class="bg-transparent border-0 border-b border-ink text-sm focus:ring-0 focus:outline-none cursor-pointer pr-8 py-2"
            >
              <option [ngValue]="7">7 days</option>
              <option [ngValue]="30">30 days</option>
              <option [ngValue]="90">90 days</option>
              <option [ngValue]="180">180 days</option>
            </select>
          </div>
          <div class="bg-ink-50/40 rounded p-4 mt-6">
            @if (trendLoading()) {
              <div class="h-60 animate-pulse bg-ink-100/50"></div>
            } @else {
              <app-line-chart [data]="chartPoints()" />
            }
          </div>
        </section>

        <!-- Two-column: top products + sales by category -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <section>
            <h2 class="text-2xl font-light tracking-tight mb-6">Top sellers</h2>
            @if (topProductsLoading()) {
              <div class="space-y-2">
                @for (_ of [1, 2, 3, 4, 5]; track $index) {
                  <div class="h-12 bg-ink-50 animate-pulse rounded"></div>
                }
              </div>
            } @else if (topProducts().length === 0) {
              <p class="text-sm text-ink-500 py-12 text-center border border-ink-200 rounded">
                No paid orders yet.
              </p>
            } @else {
              <div class="overflow-x-auto">
                <table class="w-full min-w-[480px]">
                  <tbody>
                    @for (p of topProducts(); track p.productId; let i = $index) {
                      <tr class="border-b border-ink-200 hover:bg-ink-50/60 transition-colors">
                        <td class="py-3 w-8 text-sm text-ink-400 tabular">
                          {{ i + 1 | number: '2.0' }}
                        </td>
                        <td class="py-3">
                          <a
                            [routerLink]="['/products', p.productSlug]"
                            target="_blank"
                            class="text-sm text-ink hover:text-ink-500 transition-colors link-underline"
                          >
                            {{ p.productName }}
                          </a>
                        </td>
                        <td class="py-3 text-sm text-ink-500 text-right tabular whitespace-nowrap">
                          {{ p.unitsSold | number: '1.0-0' }} sold
                        </td>
                        <td class="py-3 text-sm text-right tabular whitespace-nowrap">
                          {{ p.revenue | currency: 'INR' : 'symbol' : '1.0-0' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <section>
            <h2 class="text-2xl font-light tracking-tight mb-6">Revenue by category</h2>
            @if (categorySalesLoading()) {
              <div class="space-y-2">
                @for (_ of [1, 2, 3]; track $index) {
                  <div class="h-12 bg-ink-50 animate-pulse rounded"></div>
                }
              </div>
            } @else if (categorySales().length === 0) {
              <p class="text-sm text-ink-500 py-12 text-center border border-ink-200 rounded">
                Nothing to show yet.
              </p>
            } @else {
              <div class="space-y-3">
                @for (c of categorySales(); track c.categoryId) {
                  <div>
                    <div class="flex justify-between items-baseline mb-1.5">
                      <span class="text-sm">{{ c.categoryName }}</span>
                      <span class="text-sm tabular">
                        {{ c.revenue | currency: 'INR' : 'symbol' : '1.0-0' }}
                        <span class="text-ink-400 ml-2 text-xs">
                          {{ c.unitsSold | number: '1.0-0' }} units
                        </span>
                      </span>
                    </div>
                    <div class="h-1 w-full bg-ink-100 rounded-full overflow-hidden">
                      <div
                        class="h-full bg-ink rounded-full transition-all"
                        [style.width.%]="categoryBarWidth(c)"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            }
          </section>
        </div>

        <!-- By status + recent orders -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <section>
            <h2 class="text-2xl font-light tracking-tight mb-6">Order status</h2>
            <div class="border border-ink-200 rounded">
              @for (row of stats()!.ordersByStatus; track row.status; let last = $last) {
                <div
                  class="flex items-center justify-between px-5 py-3.5"
                  [class.border-b]="!last"
                  [class.border-ink-200]="!last"
                >
                  <span class="text-sm">{{ row.status | titlecase }}</span>
                  <span class="text-sm tabular">{{ row.count }}</span>
                </div>
              }
            </div>
          </section>

          <section class="lg:col-span-2">
            <div class="flex items-baseline justify-between mb-6">
              <h2 class="text-2xl font-light tracking-tight">Recent orders</h2>
              <a
                routerLink="/admin/orders"
                class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
                >View all →</a
              >
            </div>
            <div class="overflow-x-auto">
              <table class="w-full min-w-[480px]">
                <thead>
                  <tr class="border-b border-ink text-left">
                    <th class="pb-3 label">Order</th>
                    <th class="pb-3 label">Customer</th>
                    <th class="pb-3 label">Status</th>
                    <th class="pb-3 label">Date</th>
                    <th class="pb-3 label text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  @for (order of stats()!.recentOrders; track order.id) {
                    <tr class="border-b border-ink-200">
                      <td class="py-4 text-sm tabular">{{ order.orderNumber }}</td>
                      <td class="py-4 text-sm text-ink-500 truncate max-w-[200px]">
                        {{ order.userEmail ?? '—' }}
                      </td>
                      <td class="py-4 text-sm">{{ order.status | titlecase }}</td>
                      <td class="py-4 text-sm text-ink-500">
                        {{ order.placedAt | date: 'dd MMM' }}
                      </td>
                      <td class="py-4 text-sm tabular text-right">
                        {{ +order.total | currency: 'INR' : 'symbol' : '1.0-0' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        </div>
      }
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly stats = signal<AdminStats | null>(null);
  readonly loading = signal(true);

  readonly trend = signal<SalesTrendPoint[]>([]);
  readonly trendDays = signal(30);
  readonly trendLoading = signal(true);
  trendDaysModel = 30;

  readonly topProducts = signal<TopProductRow[]>([]);
  readonly topProductsLoading = signal(true);

  readonly categorySales = signal<CategorySalesRow[]>([]);
  readonly categorySalesLoading = signal(true);

  readonly exporting = signal(false);

  readonly chartPoints = computed<LineChartPoint[]>(() =>
    this.trend().map((p) => ({
      label: shortLabel(p.date),
      value: p.revenue,
    })),
  );

  readonly trendTotalRevenue = computed(() => this.trend().reduce((sum, p) => sum + p.revenue, 0));

  readonly trendTotalOrders = computed(() =>
    this.trend().reduce((sum, p) => sum + p.orderCount, 0),
  );

  readonly maxCategoryRevenue = computed(() =>
    Math.max(1, ...this.categorySales().map((c) => c.revenue)),
  );

  ngOnInit(): void {
    this.loadStats();
    this.loadTrend(this.trendDays());
    this.loadTopProducts();
    this.loadCategorySales();
  }

  private loadStats() {
    this.loading.set(true);
    this.adminService.getStats().subscribe({
      next: (res) => {
        this.stats.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private loadTrend(days: number) {
    this.trendLoading.set(true);
    this.adminService.getSalesTrend(days).subscribe({
      next: (res) => {
        this.trend.set(res.data);
        this.trendLoading.set(false);
      },
      error: () => this.trendLoading.set(false),
    });
  }

  private loadTopProducts() {
    this.topProductsLoading.set(true);
    this.adminService.getTopProducts(5).subscribe({
      next: (res) => {
        this.topProducts.set(res.data);
        this.topProductsLoading.set(false);
      },
      error: () => this.topProductsLoading.set(false),
    });
  }

  private loadCategorySales() {
    this.categorySalesLoading.set(true);
    this.adminService.getSalesByCategory().subscribe({
      next: (res) => {
        this.categorySales.set(res.data);
        this.categorySalesLoading.set(false);
      },
      error: () => this.categorySalesLoading.set(false),
    });
  }

  onTrendDaysChange(days: number) {
    this.trendDays.set(days);
    this.loadTrend(days);
  }

  categoryBarWidth(c: CategorySalesRow): number {
    return Math.max(2, (c.revenue / this.maxCategoryRevenue()) * 100);
  }

  exportOrders(): void {
    this.exporting.set(true);
    this.adminService.exportOrdersCsv({ status: 'paid' }).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        downloadBlob(blob, `orders-${new Date().toISOString().slice(0, 10)}.csv`);
      },
      error: () => this.exporting.set(false),
    });
  }
}

function shortLabel(yyyymmdd: string): string {
  const d = new Date(yyyymmdd + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
