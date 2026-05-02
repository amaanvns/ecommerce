import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  CatalogService,
  Category,
  ProductListQuery,
  ProductSummary,
} from '../../core/services/catalog.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-catalog',
  imports: [FormsModule, ProductCardComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Page header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Products</h1>
        @if (meta()) {
          <p class="text-sm text-gray-500 mt-1">{{ meta()!.total }} results</p>
        }
      </div>

      <div class="flex gap-8">
        <!-- Sidebar filters -->
        <aside class="hidden lg:block w-56 shrink-0">
          <div class="sticky top-20 space-y-6">
            <!-- Search -->
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2"
                >Search</label
              >
              <input
                type="text"
                [(ngModel)]="searchInput"
                (keydown.enter)="applySearch()"
                placeholder="Search products…"
                class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <!-- Categories -->
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Category
              </p>
              <ul class="space-y-1">
                <li>
                  <button
                    (click)="setCategory(null)"
                    class="w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors"
                    [class.bg-indigo-50]="!activeCategory()"
                    [class.text-indigo-700]="!activeCategory()"
                    [class.font-medium]="!activeCategory()"
                    [class.text-gray-600]="!!activeCategory()"
                    [class.hover:bg-gray-50]="!!activeCategory()"
                  >
                    All
                  </button>
                </li>
                @for (cat of categories(); track cat.id) {
                  <li>
                    <button
                      (click)="setCategory(cat.slug)"
                      class="w-full text-left text-sm px-2 py-1.5 rounded-lg transition-colors"
                      [class.bg-indigo-50]="activeCategory() === cat.slug"
                      [class.text-indigo-700]="activeCategory() === cat.slug"
                      [class.font-medium]="activeCategory() === cat.slug"
                      [class.text-gray-600]="activeCategory() !== cat.slug"
                      [class.hover:bg-gray-50]="activeCategory() !== cat.slug"
                    >
                      {{ cat.name }}
                    </button>
                  </li>
                }
              </ul>
            </div>

            <!-- Price range -->
            <div>
              <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Price</p>
              <div class="flex gap-2 items-center">
                <input
                  type="number"
                  [(ngModel)]="minPrice"
                  (change)="applyFilters()"
                  placeholder="Min"
                  min="0"
                  class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span class="text-gray-400 text-xs">–</span>
                <input
                  type="number"
                  [(ngModel)]="maxPrice"
                  (change)="applyFilters()"
                  placeholder="Max"
                  min="0"
                  class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <!-- Reset -->
            @if (hasActiveFilters()) {
              <button
                (click)="resetFilters()"
                class="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Clear filters
              </button>
            }
          </div>
        </aside>

        <!-- Main content -->
        <div class="flex-1 min-w-0">
          <!-- Sort bar -->
          <div class="flex items-center justify-between mb-4">
            <div class="text-sm text-gray-500 lg:hidden">
              @if (meta()) {
                {{ meta()!.total }} results
              }
            </div>
            <div class="flex items-center gap-2 ml-auto">
              <label class="text-sm text-gray-500">Sort:</label>
              <select
                [(ngModel)]="sortValue"
                (ngModelChange)="applyFilters()"
                class="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Name A–Z</option>
              </select>
            </div>
          </div>

          <!-- Skeleton loaders -->
          @if (loading()) {
            <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              @for (_ of skeletons; track $index) {
                <div class="rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div class="aspect-square bg-gray-200"></div>
                  <div class="p-4 space-y-2">
                    <div class="h-3 bg-gray-200 rounded w-1/3"></div>
                    <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Products grid -->
          @if (!loading()) {
            @if (products().length === 0) {
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
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <p class="text-lg font-medium text-gray-500">No products found</p>
                <p class="text-sm mt-1">Try adjusting your filters</p>
                <button
                  (click)="resetFilters()"
                  class="mt-4 text-indigo-600 hover:underline text-sm"
                >
                  Clear all filters
                </button>
              </div>
            } @else {
              <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                @for (p of products(); track p.id) {
                  <app-product-card [product]="p" />
                }
              </div>

              <!-- Pagination -->
              @if (meta() && meta()!.totalPages > 1) {
                <div class="mt-8 flex items-center justify-center gap-1">
                  <button
                    (click)="goToPage(currentPage() - 1)"
                    [disabled]="currentPage() === 1"
                    class="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    Prev
                  </button>

                  @for (p of pageNumbers(); track p) {
                    <button
                      (click)="goToPage(p)"
                      class="px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
                      [class.bg-indigo-600]="p === currentPage()"
                      [class.text-white]="p === currentPage()"
                      [class.border-indigo-600]="p === currentPage()"
                      [class.border-gray-200]="p !== currentPage()"
                      [class.hover:bg-gray-50]="p !== currentPage()"
                    >
                      {{ p }}
                    </button>
                  }

                  <button
                    (click)="goToPage(currentPage() + 1)"
                    [disabled]="currentPage() === meta()!.totalPages"
                    class="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              }
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class CatalogComponent implements OnInit {
  private readonly catalogService = inject(CatalogService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly categories = signal<Category[]>([]);
  readonly products = signal<ProductSummary[]>([]);
  readonly meta = signal<{ total: number; page: number; limit: number; totalPages: number } | null>(
    null,
  );
  readonly loading = signal(true);

  readonly activeCategory = signal<string | null>(null);
  readonly currentPage = signal(1);

  searchInput = '';
  sortValue: ProductListQuery['sort'] = 'newest';
  minPrice: number | null = null;
  maxPrice: number | null = null;

  readonly skeletons = new Array(12);

  readonly hasActiveFilters = computed(
    () => !!this.activeCategory() || !!this.searchInput || !!this.minPrice || !!this.maxPrice,
  );

  readonly pageNumbers = computed(() => {
    const total = this.meta()?.totalPages ?? 1;
    const cur = this.currentPage();
    const delta = 2;
    const pages: number[] = [];
    for (let i = Math.max(1, cur - delta); i <= Math.min(total, cur + delta); i++) {
      pages.push(i);
    }
    return pages;
  });

  ngOnInit(): void {
    this.catalogService.getCategories().subscribe((res) => this.categories.set(res.data));

    this.route.queryParamMap.subscribe((params) => {
      this.searchInput = params.get('q') ?? '';
      this.activeCategory.set(params.get('category'));
      this.sortValue = (params.get('sort') as ProductListQuery['sort']) ?? 'newest';
      this.currentPage.set(Number(params.get('page') ?? 1));
      this.minPrice = params.get('minPrice') ? Number(params.get('minPrice')) : null;
      this.maxPrice = params.get('maxPrice') ? Number(params.get('maxPrice')) : null;
      this.loadProducts();
    });
  }

  private loadProducts(): void {
    this.loading.set(true);
    const query: ProductListQuery = {
      page: this.currentPage(),
      limit: 24,
      sort: this.sortValue,
    };
    if (this.searchInput) query.q = this.searchInput;
    if (this.activeCategory()) query.category = this.activeCategory()!;
    if (this.minPrice != null) query.minPrice = this.minPrice;
    if (this.maxPrice != null) query.maxPrice = this.maxPrice;

    this.catalogService.getProducts(query).subscribe({
      next: (res) => {
        this.products.set(res.data);
        this.meta.set(res.meta);
        this.loading.set(false);
      },
      error: () => {
        this.products.set([]);
        this.loading.set(false);
      },
    });
  }

  applySearch(): void {
    this.pushQueryParams({ q: this.searchInput || null, page: null });
  }

  applyFilters(): void {
    this.pushQueryParams({
      sort: this.sortValue ?? null,
      minPrice: this.minPrice ?? null,
      maxPrice: this.maxPrice ?? null,
      page: null,
    });
  }

  setCategory(slug: string | null): void {
    this.pushQueryParams({ category: slug, page: null });
  }

  goToPage(page: number): void {
    this.pushQueryParams({ page });
  }

  resetFilters(): void {
    this.searchInput = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.sortValue = 'newest';
    this.router.navigate([], { queryParams: {} });
  }

  private pushQueryParams(params: Record<string, string | number | null | undefined>): void {
    const clean: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v != null) clean[k] = v;
    }
    this.router.navigate([], { queryParams: clean, queryParamsHandling: 'merge' });
  }
}
