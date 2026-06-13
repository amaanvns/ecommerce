import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  CatalogService,
  Category,
  ProductFacets,
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
        <!-- Mobile filter backdrop -->
        @if (filtersOpen()) {
          <div
            class="lg:hidden fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm animate-fade-in"
            (click)="filtersOpen.set(false)"
            aria-hidden="true"
          ></div>
        }

        <!-- Filters — sidebar on desktop, slide-in drawer on mobile -->
        <aside
          class="fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-80 max-w-[85vw] lg:w-56 shrink-0 bg-paper lg:bg-transparent overflow-y-auto lg:overflow-visible transition-transform duration-300 lg:translate-x-0 px-6 py-6 lg:p-0"
          [class.translate-x-0]="filtersOpen()"
          [class.-translate-x-full]="!filtersOpen()"
        >
          <div class="flex items-center justify-between mb-8 lg:hidden">
            <p class="label">Filters</p>
            <button
              type="button"
              (click)="filtersOpen.set(false)"
              class="text-ink-500 hover:text-ink transition-colors"
              aria-label="Close filters"
            >
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path stroke-linecap="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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

            @if (facets().sizes.length > 0) {
              <div>
                <p class="label mb-4">Size</p>
                <div class="flex flex-wrap gap-2">
                  @for (s of facets().sizes; track s) {
                    <button
                      (click)="toggleSize(s)"
                      class="min-w-[2.5rem] px-3 py-1.5 border rounded-full text-sm transition-all"
                      [class.bg-ink]="activeSize() === s"
                      [class.text-paper]="activeSize() === s"
                      [class.border-ink]="activeSize() === s"
                      [class.border-ink-200]="activeSize() !== s"
                      [class.hover:border-ink]="activeSize() !== s"
                    >
                      {{ s }}
                    </button>
                  }
                </div>
              </div>
            }

            @if (facets().colors.length > 0) {
              <div>
                <p class="label mb-4">Colour</p>
                <div class="flex flex-wrap gap-2">
                  @for (c of facets().colors; track c) {
                    <button
                      (click)="toggleColor(c)"
                      class="px-3 py-1.5 border rounded-full text-sm transition-all"
                      [class.bg-ink]="activeColor() === c"
                      [class.text-paper]="activeColor() === c"
                      [class.border-ink]="activeColor() === c"
                      [class.border-ink-200]="activeColor() !== c"
                      [class.hover:border-ink]="activeColor() !== c"
                    >
                      {{ c }}
                    </button>
                  }
                </div>
              </div>
            }

            @if (hasActiveFilters()) {
              <button
                (click)="resetFilters()"
                class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
              >
                Clear filters
              </button>
            }

            <button
              type="button"
              (click)="filtersOpen.set(false)"
              class="lg:hidden btn-primary w-full"
            >
              View results
            </button>
          </div>
        </aside>

        <!-- Main content -->
        <div class="flex-1 min-w-0">
          <!-- Sort bar -->
          <div class="flex items-center justify-between gap-3 mb-12 pb-5 border-b border-ink-200">
            <button
              type="button"
              (click)="filtersOpen.set(true)"
              class="lg:hidden inline-flex items-center gap-2 text-sm border border-ink-300 rounded-full px-4 py-1.5 hover:border-ink transition-colors"
            >
              Filters
              @if (hasActiveFilters()) {
                <span class="w-1.5 h-1.5 rounded-full bg-ink"></span>
              }
            </button>
            <p class="hidden lg:block text-sm text-ink-500 tabular">
              {{ products().length }} shown
            </p>
            <div class="flex items-center gap-3 ml-auto">
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

  readonly filtersOpen = signal(false);
  readonly categories = signal<Category[]>([]);
  readonly products = signal<ProductSummary[]>([]);
  readonly meta = signal<{ total: number; page: number; limit: number; totalPages: number } | null>(
    null,
  );
  readonly loading = signal(true);

  readonly activeCategory = signal<string | null>(null);
  readonly activeColor = signal<string | null>(null);
  readonly activeSize = signal<string | null>(null);
  readonly facets = signal<ProductFacets>({ colors: [], sizes: [] });
  readonly currentPage = signal(1);

  searchInput = '';
  sortValue: ProductListQuery['sort'] = 'newest';
  minPrice: number | null = null;
  maxPrice: number | null = null;

  readonly skeletons = new Array(9);

  readonly hasActiveFilters = computed(
    () =>
      !!this.activeCategory() ||
      !!this.searchInput ||
      !!this.minPrice ||
      !!this.maxPrice ||
      !!this.activeColor() ||
      !!this.activeSize(),
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
      const cat = params.get('category');
      this.activeCategory.set(cat);
      this.activeColor.set(params.get('color'));
      this.activeSize.set(params.get('size'));
      this.sortValue = (params.get('sort') as ProductListQuery['sort']) ?? 'newest';
      this.currentPage.set(Number(params.get('page') ?? 1));
      this.minPrice = params.get('minPrice') ? Number(params.get('minPrice')) : null;
      this.maxPrice = params.get('maxPrice') ? Number(params.get('maxPrice')) : null;
      this.applySeo();
      this.loadProducts();
      this.catalogService
        .getFacets(cat ?? undefined)
        .subscribe({ next: (res) => this.facets.set(res.data) });
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
      ? `Search results for "${q}" in the Star Enterprises collection.`
      : 'Browse the full Star Enterprises collection — considered objects, made well.';
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

  // Guards against out-of-order responses when filters/pages change rapidly:
  // only the latest request may update the list
  private loadSeq = 0;

  private loadProducts(): void {
    const seq = ++this.loadSeq;
    this.loading.set(true);
    const query: ProductListQuery = {
      page: this.currentPage(),
      limit: 24,
      sort: this.sortValue,
    };
    if (this.searchInput) query.q = this.searchInput;
    if (this.activeCategory()) query.category = this.activeCategory()!;
    if (this.activeColor()) query.color = this.activeColor()!;
    if (this.activeSize()) query.size = this.activeSize()!;
    if (this.minPrice != null) query.minPrice = this.minPrice;
    if (this.maxPrice != null) query.maxPrice = this.maxPrice;

    this.catalogService.getProducts(query).subscribe({
      next: (res) => {
        if (seq !== this.loadSeq) return;
        this.products.set(res.data);
        this.meta.set(res.meta);
        this.loading.set(false);
      },
      error: () => {
        if (seq !== this.loadSeq) return;
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
    this.filtersOpen.set(false);
    this.pushQueryParams({ category: slug, page: null });
  }

  // Toggle a colour/size chip (clicking the active one clears it)
  toggleColor(color: string): void {
    this.pushQueryParams({ color: this.activeColor() === color ? null : color, page: null });
  }

  toggleSize(size: string): void {
    this.pushQueryParams({ size: this.activeSize() === size ? null : size, page: null });
  }

  goToPage(page: number): void {
    this.pushQueryParams({ page });
  }

  resetFilters(): void {
    this.searchInput = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.sortValue = 'newest';
    this.activeColor.set(null);
    this.activeSize.set(null);
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
