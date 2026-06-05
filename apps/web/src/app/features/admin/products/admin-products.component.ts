import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, AdminProductRow, PaginatedMeta } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-products',
  imports: [CurrencyPipe, FormsModule, RouterLink],
  template: `
    <section class="border-b border-ink-200 bg-paper">
      <div
        class="px-4 sm:px-6 lg:px-10 py-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6"
      >
        <div>
          <p class="label mb-3">— Studio · Catalog</p>
          <h1 class="font-light text-5xl">Products.</h1>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch()"
            placeholder="Search products…"
            class="bg-transparent border-0 border-b border-ink-300 text-sm focus:border-ink focus:ring-0 focus:outline-none w-full sm:w-64 px-0 py-2"
          />
          <a routerLink="/admin/products/new" class="btn-primary shrink-0">+ New Product</a>
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
          <table class="w-full min-w-[720px]">
            <thead>
              <tr class="border-b border-ink text-left">
                <th class="pb-3 label">Product</th>
                <th class="pb-3 label">Category</th>
                <th class="pb-3 label text-center">Variants</th>
                <th class="pb-3 label text-center">Stock</th>
                <th class="pb-3 label text-right">Min Price</th>
                <th class="pb-3 label text-center">Live</th>
                <th class="pb-3 label text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (product of products(); track product.id) {
                <tr
                  class="border-b border-ink-200 hover:bg-ink-50 transition-colors"
                  [class.opacity-50]="togglingId() === product.id || deletingId() === product.id"
                >
                  <td class="py-4">
                    <p class="text-base leading-tight">{{ product.name }}</p>
                    @if (product.brand) {
                      <p class="text-2xs uppercase tracking-widest text-ink-400 mt-1">
                        {{ product.brand }}
                      </p>
                    }
                  </td>
                  <td class="py-4 text-sm text-ink-500">{{ product.categoryName ?? '—' }}</td>
                  <td class="py-4 font-mono text-sm text-center">{{ product.variantCount }}</td>
                  <td class="py-4 font-mono text-sm text-center">
                    <span [class.text-ink]="product.totalStock === 0">{{
                      product.totalStock
                    }}</span>
                  </td>
                  <td class="py-4 font-mono text-sm text-right">
                    @if (product.minPrice) {
                      {{ +product.minPrice | currency: 'INR' : 'symbol' : '1.2-2' }}
                    } @else {
                      —
                    }
                  </td>
                  <td class="py-4 text-center">
                    <button
                      (click)="togglePublish(product)"
                      [disabled]="togglingId() === product.id"
                      class="relative inline-flex items-center w-10 h-5 transition-colors focus:outline-none disabled:opacity-50"
                      [class.bg-ink]="product.isPublished"
                      [class.bg-ink-200]="!product.isPublished"
                    >
                      <span
                        class="w-4 h-4 bg-paper transition-transform"
                        [class.translate-x-5]="product.isPublished"
                        [class.translate-x-0.5]="!product.isPublished"
                      ></span>
                    </button>
                  </td>
                  <td class="py-4 text-right">
                    <div class="flex items-center justify-end gap-4">
                      <a
                        [routerLink]="['/admin/products', product.id, 'edit']"
                        class="text-2xs uppercase tracking-widest link-underline"
                        >Edit</a
                      >
                      <button
                        (click)="deleteProduct(product)"
                        [disabled]="deletingId() === product.id"
                        class="text-2xs uppercase tracking-widest text-ink hover:text-ink transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              }
              @if (products().length === 0) {
                <tr>
                  <td colspan="7" class="py-16 text-center">
                    <p class="text-3xl font-light">No products.</p>
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
