import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, AdminProductRow, PaginatedMeta } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-products',
  imports: [CurrencyPipe, FormsModule, RouterLink],
  template: `
    <div class="p-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Products</h1>
        <div class="flex items-center gap-3">
          <a
            routerLink="/admin/products/new"
            class="text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors font-semibold"
            >+ New Product</a
          >
          <div class="relative">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (ngModelChange)="onSearch()"
              placeholder="Search products…"
              class="text-sm border border-gray-200 rounded-lg pl-9 pr-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56"
            />
            <svg
              class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </div>
        </div>
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
                  <th class="px-4 py-3 font-semibold">Product</th>
                  <th class="px-4 py-3 font-semibold">Category</th>
                  <th class="px-4 py-3 font-semibold">Variants</th>
                  <th class="px-4 py-3 font-semibold">Stock</th>
                  <th class="px-4 py-3 font-semibold">Min Price</th>
                  <th class="px-4 py-3 font-semibold">Published</th>
                  <th class="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                @for (product of products(); track product.id) {
                  <tr
                    class="hover:bg-gray-50 transition-colors"
                    [class.opacity-50]="togglingId() === product.id || deletingId() === product.id"
                  >
                    <td class="px-4 py-3">
                      <p class="font-medium text-gray-900">{{ product.name }}</p>
                      @if (product.brand) {
                        <p class="text-xs text-gray-400">{{ product.brand }}</p>
                      }
                    </td>
                    <td class="px-4 py-3 text-gray-500">{{ product.categoryName ?? '—' }}</td>
                    <td class="px-4 py-3 text-gray-600 text-center">{{ product.variantCount }}</td>
                    <td class="px-4 py-3">
                      <span
                        class="font-semibold"
                        [class.text-green-600]="product.totalStock > 0"
                        [class.text-red-500]="product.totalStock === 0"
                        >{{ product.totalStock }}</span
                      >
                    </td>
                    <td class="px-4 py-3 text-gray-700">
                      @if (product.minPrice) {
                        {{ +product.minPrice | currency: 'INR' : 'symbol' : '1.2-2' }}
                      } @else {
                        —
                      }
                    </td>
                    <td class="px-4 py-3">
                      <button
                        (click)="togglePublish(product)"
                        [disabled]="togglingId() === product.id"
                        class="relative inline-flex items-center w-10 h-5 rounded-full transition-colors focus:outline-none disabled:opacity-50"
                        [class.bg-indigo-600]="product.isPublished"
                        [class.bg-gray-200]="!product.isPublished"
                      >
                        <span
                          class="w-4 h-4 bg-white rounded-full shadow transition-transform"
                          [class.translate-x-5]="product.isPublished"
                          [class.translate-x-0.5]="!product.isPublished"
                        ></span>
                      </button>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex items-center gap-2">
                        <a
                          [routerLink]="['/admin/products', product.id, 'edit']"
                          class="text-xs text-indigo-600 border border-indigo-100 hover:border-indigo-200 px-2 py-1 rounded-lg transition-colors hover:bg-indigo-50"
                          >Edit</a
                        >
                        <button
                          (click)="deleteProduct(product)"
                          [disabled]="deletingId() === product.id"
                          class="text-xs text-red-500 hover:text-red-700 border border-red-100 hover:border-red-200 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                }
                @if (products().length === 0) {
                  <tr>
                    <td colspan="7" class="px-4 py-12 text-center text-gray-400 text-sm">
                      No products found
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

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
export class AdminProductsComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly products = signal<AdminProductRow[]>([]);
  readonly meta = signal<PaginatedMeta | null>(null);
  readonly loading = signal(true);
  readonly togglingId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  searchQuery = '';
  currentPage = 1;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.load();
    }, 350);
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminService.getProducts(this.currentPage, 20, this.searchQuery || undefined).subscribe({
      next: (res) => {
        this.products.set(res.data);
        this.meta.set(res.meta);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  togglePublish(product: AdminProductRow): void {
    this.togglingId.set(product.id);
    this.adminService.updateProduct(product.id, { isPublished: !product.isPublished }).subscribe({
      next: (res) => {
        this.products.update((rows) =>
          rows.map((r) => (r.id === product.id ? { ...r, isPublished: res.data.isPublished } : r)),
        );
        this.togglingId.set(null);
      },
      error: () => this.togglingId.set(null),
    });
  }

  deleteProduct(product: AdminProductRow): void {
    if (!confirm(`Delete "${product.name}"? This action cannot be undone.`)) return;
    this.deletingId.set(product.id);
    this.adminService.deleteProduct(product.id).subscribe({
      next: () => {
        this.products.update((rows) => rows.filter((r) => r.id !== product.id));
        this.deletingId.set(null);
      },
      error: () => this.deletingId.set(null),
    });
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
