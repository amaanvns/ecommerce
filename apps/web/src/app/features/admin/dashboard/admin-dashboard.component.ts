import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService, AdminStats } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CurrencyPipe, TitleCasePipe, RouterLink],
  template: `
    <div class="p-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>

      @if (loading()) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          @for (_ of [1, 2, 3, 4]; track $index) {
            <div class="h-28 bg-gray-100 rounded-2xl animate-pulse"></div>
          }
        </div>
      }

      @if (!loading() && stats()) {
        <!-- Stats cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Revenue</p>
            <p class="text-2xl font-bold text-gray-900 mt-2">
              {{ stats()!.totalRevenue | currency: 'INR' : 'symbol' : '1.0-0' }}
            </p>
            <p class="text-xs text-gray-400 mt-1">Paid orders only</p>
          </div>
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Orders</p>
            <p class="text-2xl font-bold text-gray-900 mt-2">{{ stats()!.totalOrders }}</p>
            <p class="text-xs text-gray-400 mt-1">All time</p>
          </div>
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Users</p>
            <p class="text-2xl font-bold text-gray-900 mt-2">{{ stats()!.totalUsers }}</p>
            <p class="text-xs text-gray-400 mt-1">Registered</p>
          </div>
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide">Products</p>
            <p class="text-2xl font-bold text-gray-900 mt-2">{{ stats()!.totalProducts }}</p>
            <p class="text-xs text-gray-400 mt-1">Active (not deleted)</p>
          </div>
        </div>

        <!-- Orders by status -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 class="text-sm font-semibold text-gray-700 mb-4">Orders by Status</h2>
            <div class="space-y-2">
              @for (row of stats()!.ordersByStatus; track row.status) {
                <div class="flex items-center justify-between text-sm">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-semibold"
                    [class]="statusClass(row.status)"
                    >{{ row.status | titlecase }}</span
                  >
                  <span class="font-semibold text-gray-700">{{ row.count }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Recent orders -->
          <div class="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-sm font-semibold text-gray-700">Recent Orders</h2>
              <a routerLink="/admin/orders" class="text-xs text-indigo-600 hover:underline"
                >View all</a
              >
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th class="pb-2 font-medium">Order</th>
                    <th class="pb-2 font-medium">Customer</th>
                    <th class="pb-2 font-medium">Status</th>
                    <th class="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  @for (order of stats()!.recentOrders; track order.id) {
                    <tr class="text-gray-700">
                      <td class="py-2.5 font-mono text-xs">#{{ order.orderNumber }}</td>
                      <td class="py-2.5 text-gray-500 truncate max-w-[120px]">
                        {{ order.userEmail ?? '—' }}
                      </td>
                      <td class="py-2.5">
                        <span
                          class="px-2 py-0.5 rounded-full text-xs font-semibold"
                          [class]="statusClass(order.status)"
                        >
                          {{ order.status | titlecase }}
                        </span>
                      </td>
                      <td class="py-2.5 text-right font-semibold">
                        {{ +order.total | currency: 'INR' : 'symbol' : '1.2-2' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly stats = signal<AdminStats | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.adminService.getStats().subscribe({
      next: (res) => {
        this.stats.set(res.data);
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
