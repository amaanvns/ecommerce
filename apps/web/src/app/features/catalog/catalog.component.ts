import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  CatalogService,
  Category,
  ProductListQuery,
  ProductSummary,
} from '../../core/services/catalog.service';
import { SeoService } from '../../core/services/seo.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-catalog',
  imports: [FormsModule, ProductCardComponent],
  template: `
    <!-- Page header -->
    <section class="container-edge pt-20 pb-12 lg:pt-28 lg:pb-16">
      <h1 class="text-4xl md:text-5xl font-light tracking-tighter">Shop</h1>
      @if (meta()) {
        <p class="text-sm text-ink-500 mt-3 tabular">
          {{ meta()!.total }} {{ meta()!.total === 1 ? 'item' : 'items' }}
        </p>
      }
    </section>

    <div class="container-edge pb-24">
      <div class="flex flex-col lg:flex-row gap-12 lg:gap-16">
        <!-- Sidebar filters -->
        <aside class="lg:w-56 shrink-0">
          <div class="lg:sticky lg:top-28 space-y-10">
            <div>
              <p class="label mb-4">Search</p>
              <input
                type="text"
                [(ngModel)]="searchInput"
                (keydown.enter)="applySearch()"
                placeholder="Search…"
                class="input-clean text-sm"
              />
            </div>

            <div>
              <p class="label mb-4">Category</p>
              <ul class="space-y-2.5">
                <li>
                  <button
                    (click)="setCategory(null)"
                    class="text-sm transition-colors hover:text-ink"
                    [class.text-ink]="!activeCategory()"
                    [class.text-ink-500]="!!activeCategory()"
                  >
                    All
                  </button>
                </li>
                @for (cat of categories(); track cat.id) {
                  <li>
                    <button
                      (click)="setCategory(cat.slug)"
                      class="text-sm transition-colors hover:text-ink"
                      [class.text-ink]="activeCategory() === cat.slug"
                      [class.text-ink-500]="activeCategory() !== cat.slug"
                    >
                      {{ cat.name }}
                    </button>
                  </li>
                }
              </ul>
            </div>

            <div>
              <p class="label mb-4">Price</p>
              <div class="flex gap-3 items-center">
                <input
                  type="number"
                  [(ngModel)]="minPrice"
                  (change)="applyFilters()"
                  placeholder="Min"
                  min="0"
                  class="input-clean text-sm tabular"
                />
                <span class="text-ink-300">–</span>
                <input
                  type="number"
                  [(ngModel)]="maxPrice"
                  (change)="applyFilters()"
                  placeholder="Max"
                  min="0"
                  class="input-clean text-sm tabular"
                />
              </div>
            </div>

            @if (hasActiveFilters()) {
              <button
                (click)="resetFilters()"
                class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
              >
                Clear filters
              </button>
            }
          </div>
        </aside>

        <!-- Main content -->
        <div class="flex-1 min-w-0">
          <!-- Sort bar -->
          <div class="flex items-center justify-between mb-12 pb-5 border-b border-ink-200">
            <p class="text-sm text-ink-500 tabular">{{ products().length }} shown</p>
            <div class="flex items-center gap-3">
              <span class="text-sm text-ink-500">Sort by</span>
              <select
                [(ngModel)]="sortValue"
                (ngModelChange)="applyFilters()"
                class="bg-transparent border-0 text-sm focus:ring-0 focus:outline-none cursor-pointer pr-8"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price, low to high</option>
                <option value="price_desc">Price, high to low</option>
                <option value="name_asc">Name A–Z</option>
              </select>
            </div>
          </div>

          @if (loading()) {
            <div class="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
              @for (_ of skeletons; track $index) {
                <div class="animate-pulse">
                  <div class="aspect-[4/5] bg-ink-100 mb-4"></div>
                  <div class="h-3 bg-ink-100 w-1/3 mb-2"></div>
                  <div class="h-4 bg-ink-100 w-2/3 mb-2"></div>
                  <div class="h-4 bg-ink-100 w-1/4"></div>
                </div>
              }
            </div>
          }

          @if (!loading()) {
            @if (products().length === 0) {
              <div class="text-center py-32">
                <p class="text-3xl font-light tracking-tight mb-3">Nothing found</p>
                <p class="text-ink-500 max-w-sm mx-auto">
                  Try adjusting your filters or clearing them.
                </p>
                <button (click)="resetFilters()" class="btn-outline mt-8">Clear filters</button>
              </div>
            } @else {
              <div class="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-16">
                @for (p of products(); track p.id) {
                  <app-product-card [product]="p" />
                }
              </div>

              @if (meta() && meta()!.totalPages > 1) {
                <div class="mt-20 flex items-center justify-between border-t border-ink-200 pt-8">
                  <button
                    (click)="goToPage(currentPage() - 1)"
                    [disabled]="currentPage() === 1"
                    class="text-sm text-ink-500 hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ← Previous
                  </button>

                  <div class="flex items-center gap-1 tabular">
                    @for (p of pageNumbers(); track p) {
                      <button
                        (click)="goToPage(p)"
                        class="w-9 h-9 text-sm rounded-full transition-colors"
                        [class.bg-ink]="p === currentPage()"
                        [class.text-paper]="p === currentPage()"
                        [class.text-ink-500]="p !== currentPage()"
                        [class.hover:text-ink]="p !== currentPage()"
                      >
                        {{ p }}
                      </button>
                    }
                  </div>

                  <button
                    (click)="goToPage(currentPage() + 1)"
                    [disabled]="currentPage() === meta()!.totalPages"
                    class="text-sm text-ink-500 hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Next →
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
  private readonly seo = inject(SeoService);

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

  readonly skeletons = new Array(9);

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
      this.applySeo();
      this.loadProducts();
    });
  }

  private applySeo(): void {
    const cat = this.activeCategory();
    const q = this.searchInput;
    const title = q
      ? `Search · ${q}`
      : cat
        ? `${cat.charAt(0).toUpperCase() + cat.slice(1)}`
        : 'Shop all';
    const description = q
      ? `Search results for "${q}" in the Shopzone collection.`
      : 'Browse the full Shopzone collection — considered objects, made well.';
    // Don't index search-result and paginated pages (avoid duplicate-content penalties)
    const noindex = !!q || this.currentPage() > 1;
    this.seo.apply({
      title,
      description,
      url: '/products',
      type: 'website',
      noindex,
    });
    this.seo.setJsonLd([]);
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
