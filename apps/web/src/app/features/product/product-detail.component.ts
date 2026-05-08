import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { CatalogService, ProductDetail, ProductVariant } from '../../core/services/catalog.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';
import { ReviewsService } from '../../core/services/reviews.service';
import { SeoService } from '../../core/services/seo.service';
import { ProductReviewsComponent } from '../../shared/components/product-reviews/product-reviews.component';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, CurrencyPipe, ProductReviewsComponent],
  template: `
    @if (loading()) {
      <div class="container-edge py-16 animate-pulse">
        <div class="grid lg:grid-cols-12 gap-12">
          <div class="lg:col-span-7 aspect-[4/5] bg-ink-100"></div>
          <div class="lg:col-span-5 space-y-4">
            <div class="h-3 bg-ink-100 w-1/4"></div>
            <div class="h-12 bg-ink-100 w-3/4"></div>
            <div class="h-6 bg-ink-100 w-1/3"></div>
            <div class="h-24 bg-ink-100"></div>
          </div>
        </div>
      </div>
    }

    @if (!loading() && !product()) {
      <div class="container-edge py-32 text-center">
        <p class="text-4xl font-light tracking-tight mb-4">Not found</p>
        <p class="text-ink-500 mb-8">This product is no longer available.</p>
        <a routerLink="/products" class="btn-outline">Back to Shop</a>
      </div>
    }

    @if (!loading() && product()) {
      <!-- Breadcrumb -->
      <div class="container-edge pt-8 pb-4">
        <nav class="flex items-center gap-2 text-sm text-ink-400">
          <a routerLink="/" class="hover:text-ink transition-colors">Home</a>
          <span>/</span>
          <a routerLink="/products" class="hover:text-ink transition-colors">Shop</a>
          @if (product()!.category) {
            <span>/</span>
            <a
              [routerLink]="['/products']"
              [queryParams]="{ category: product()!.category!.slug }"
              class="hover:text-ink transition-colors"
              >{{ product()!.category!.name }}</a
            >
          }
        </nav>
      </div>

      <div class="container-edge pb-32">
        <div class="grid lg:grid-cols-12 gap-8 lg:gap-12">
          <!-- Image gallery -->
          <div class="lg:col-span-7 space-y-4">
            <div class="aspect-[4/5] overflow-hidden bg-ink-50">
              <img
                [src]="activeImage()"
                [alt]="product()!.name"
                class="w-full h-full object-cover"
                fetchpriority="high"
                decoding="async"
              />
            </div>
            @if (product()!.images.length > 1) {
              <div class="grid grid-cols-5 gap-2">
                @for (img of product()!.images; track img.id) {
                  <button
                    type="button"
                    (click)="activeImageIdx.set($index)"
                    class="aspect-square overflow-hidden bg-ink-50 transition-all"
                    [class.ring-1]="activeImageIdx() === $index"
                    [class.ring-ink]="activeImageIdx() === $index"
                    [class.opacity-50]="activeImageIdx() !== $index"
                    [class.hover:opacity-100]="activeImageIdx() !== $index"
                    [attr.aria-label]="'Show image ' + ($index + 1)"
                    [attr.aria-pressed]="activeImageIdx() === $index"
                  >
                    <img
                      [src]="img.url"
                      [alt]="img.alt ?? product()!.name"
                      class="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                }
              </div>
            }
          </div>

          <!-- Product info (sticky) -->
          <div class="lg:col-span-5">
            <div class="lg:sticky lg:top-28 flex flex-col gap-6">
              @if (product()!.brand) {
                <p class="text-sm text-ink-500">{{ product()!.brand }}</p>
              }
              <h1 class="text-3xl md:text-4xl font-light tracking-tight leading-tight">
                {{ product()!.name }}
              </h1>

              <div class="flex items-baseline gap-4 tabular">
                <span class="text-xl">
                  {{ +selectedVariant()!.price | currency }}
                </span>
                @if (selectedVariant()!.compareAtPrice) {
                  <span class="text-sm text-ink-400 line-through">
                    {{ +selectedVariant()!.compareAtPrice! | currency }}
                  </span>
                  <span class="text-sm text-ink-500">−{{ savingsPct() }}%</span>
                }
              </div>

              @if (product()!.description) {
                <p class="text-ink-500 leading-relaxed pt-4 border-t border-ink-200">
                  {{ product()!.description }}
                </p>
              }

              <!-- Variant selectors -->
              @for (attr of attrKeys(); track attr) {
                <div class="border-t border-ink-200 pt-6">
                  <div class="flex items-center justify-between mb-3">
                    <p class="label">{{ attr }}</p>
                    <p class="text-sm text-ink">
                      {{ selectedAttrs()[attr] }}
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    @for (val of attrValues()[attr]; track val) {
                      <button
                        (click)="selectAttr(attr, val)"
                        class="min-w-[2.75rem] px-4 py-2.5 border rounded-full text-sm transition-all"
                        [class.bg-ink]="selectedAttrs()[attr] === val"
                        [class.text-paper]="selectedAttrs()[attr] === val"
                        [class.border-ink]="selectedAttrs()[attr] === val"
                        [class.border-ink-200]="selectedAttrs()[attr] !== val"
                        [class.hover:border-ink]="selectedAttrs()[attr] !== val"
                      >
                        {{ val }}
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- Stock indicator -->
              <div class="flex items-center gap-3 text-sm border-t border-ink-200 pt-6">
                @if ((selectedVariant()?.stockQty ?? 0) > 0) {
                  <span class="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                  @if ((selectedVariant()?.stockQty ?? 0) <= 5) {
                    <span class="text-ink">Only {{ selectedVariant()!.stockQty }} left</span>
                  } @else {
                    <span class="text-ink-500">In stock · ships in 2–5 days</span>
                  }
                } @else {
                  <span class="w-1.5 h-1.5 rounded-full bg-ink-400"></span>
                  <span class="text-ink-500">Out of stock</span>
                }
              </div>

              <!-- Actions -->
              <div class="flex gap-3">
                @if (auth.isAuthenticated()) {
                  <button
                    (click)="addToCart()"
                    class="btn-primary flex-1"
                    [disabled]="(selectedVariant()?.stockQty ?? 0) === 0 || addingToCart()"
                  >
                    @if (addingToCart()) {
                      <svg class="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          stroke-width="2"
                          class="opacity-25"
                        />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="2" />
                      </svg>
                      Adding…
                    } @else {
                      Add to Bag
                    }
                  </button>
                  <button
                    (click)="toggleWishlist()"
                    class="px-5 border border-ink rounded-full transition-colors"
                    [class.bg-ink]="wishlist.has(product()!.id)"
                    [class.text-paper]="wishlist.has(product()!.id)"
                    [class.hover:bg-ink]="!wishlist.has(product()!.id)"
                    [class.hover:text-paper]="!wishlist.has(product()!.id)"
                    [title]="wishlist.has(product()!.id) ? 'Remove from wishlist' : 'Save'"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      [attr.fill]="wishlist.has(product()!.id) ? 'currentColor' : 'none'"
                      stroke="currentColor"
                      stroke-width="1.25"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                      />
                    </svg>
                  </button>
                } @else {
                  <a routerLink="/auth/login" class="btn-primary flex-1">Sign in to Purchase</a>
                }
              </div>

              @if (addedToCart()) {
                <div
                  class="flex items-center justify-between gap-2 text-sm text-paper bg-ink px-5 py-3.5 rounded-full animate-fade-in"
                >
                  <span>Added to bag</span>
                  <button (click)="cartService.open()" class="link-underline">View bag →</button>
                </div>
              }

              <!-- Service notes -->
              <ul class="border-t border-ink-200 pt-6 space-y-3 text-sm text-ink-500">
                <li>Free shipping over ₹2,500</li>
                <li>30-day returns</li>
                <li>Lifetime care &amp; repair</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Reviews -->
        <app-product-reviews [productId]="product()!.id" />
      </div>
    }
  `,
})
export class ProductDetailComponent implements OnInit {
  private readonly catalogService = inject(CatalogService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  readonly cartService = inject(CartService);
  readonly wishlist = inject(WishlistService);
  readonly auth = inject(AuthService);

  readonly product = signal<ProductDetail | null>(null);
  readonly loading = signal(true);
  readonly activeImageIdx = signal(0);
  readonly selectedAttrs = signal<Record<string, string>>({});
  readonly addingToCart = signal(false);
  readonly addedToCart = signal(false);

  readonly activeImage = computed(() => {
    const imgs = this.product()?.images ?? [];
    return imgs[this.activeImageIdx()]?.url ?? '';
  });

  readonly attrKeys = computed(() => {
    const variants = this.product()?.variants ?? [];
    const keys = new Set<string>();
    for (const v of variants) Object.keys(v.attributes).forEach((k) => keys.add(k));
    return [...keys];
  });

  readonly attrValues = computed(() => {
    const variants = this.product()?.variants ?? [];
    const map: Record<string, string[]> = {};
    for (const v of variants) {
      for (const [k, val] of Object.entries(v.attributes)) {
        if (!map[k]) map[k] = [];
        if (!map[k].includes(val)) map[k].push(val);
      }
    }
    return map;
  });

  readonly selectedVariant = computed<ProductVariant | undefined>(() => {
    const variants = this.product()?.variants ?? [];
    const attrs = this.selectedAttrs();
    if (Object.keys(attrs).length === 0) return variants[0];
    return (
      variants.find((v) => Object.entries(attrs).every(([k, val]) => v.attributes[k] === val)) ??
      variants[0]
    );
  });

  readonly savingsPct = computed(() => {
    const v = this.selectedVariant();
    if (!v?.compareAtPrice) return 0;
    const orig = +v.compareAtPrice;
    const curr = +v.price;
    return Math.round(((orig - curr) / orig) * 100);
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug')!;
      this.loading.set(true);
      this.catalogService.getProduct(slug).subscribe({
        next: (res) => {
          this.product.set(res.data);
          this.loading.set(false);
          const initial: Record<string, string> = {};
          for (const [k, vals] of Object.entries(this.attrValues())) {
            initial[k] = vals[0];
          }
          this.selectedAttrs.set(initial);
          this.applySeo(res.data);
        },
        error: () => {
          this.product.set(null);
          this.loading.set(false);
          this.seo.apply({
            title: 'Product not found',
            description: 'This product is no longer available.',
            noindex: true,
          });
        },
      });
    });
  }

  private applySeo(product: ProductDetail): void {
    const variant = product.variants[0];
    const minPrice = product.variants.reduce(
      (min, v) => (min === null || +v.price < min ? +v.price : min),
      null as number | null,
    );
    const inStock = product.variants.some((v) => v.stockQty > 0);
    const image = product.images[0]?.url;
    const description =
      product.description ?? `Shop ${product.name}${product.brand ? ' by ' + product.brand : ''}.`;

    this.seo.apply({
      title: product.name,
      description,
      url: `/products/${product.slug}`,
      image,
      type: 'product',
    });

    const productSchema: Record<string, unknown> = {
      '@type': 'Product',
      name: product.name,
      description,
      sku: variant?.sku,
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
      image: product.images.map((i) => i.url),
      offers:
        minPrice != null
          ? {
              '@type': 'Offer',
              price: minPrice.toFixed(2),
              priceCurrency: 'INR',
              availability: inStock
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            }
          : undefined,
    };

    const breadcrumbSchema: Record<string, unknown> = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: '/products' },
        ...(product.category
          ? [
              {
                '@type': 'ListItem',
                position: 3,
                name: product.category.name,
                item: `/products?category=${product.category.slug}`,
              },
              {
                '@type': 'ListItem',
                position: 4,
                name: product.name,
                item: `/products/${product.slug}`,
              },
            ]
          : [
              {
                '@type': 'ListItem',
                position: 3,
                name: product.name,
                item: `/products/${product.slug}`,
              },
            ]),
      ],
    };

    // Pull aggregate rating from approved reviews and merge into Product
    this.reviewsService.list(product.id).subscribe({
      next: (reviewsRes) => {
        if (reviewsRes.meta.total > 0) {
          productSchema['aggregateRating'] = {
            '@type': 'AggregateRating',
            ratingValue: reviewsRes.meta.average.toFixed(2),
            reviewCount: reviewsRes.meta.total,
          };
        }
        this.seo.setJsonLd([productSchema, breadcrumbSchema]);
      },
      error: () => this.seo.setJsonLd([productSchema, breadcrumbSchema]),
    });
  }

  selectAttr(key: string, value: string): void {
    this.selectedAttrs.update((prev) => ({ ...prev, [key]: value }));
  }

  addToCart(): void {
    const variant = this.selectedVariant();
    if (!variant) return;
    this.addingToCart.set(true);
    this.cartService.addItem(variant.id, 1).subscribe({
      next: () => {
        this.addingToCart.set(false);
        this.addedToCart.set(true);
        setTimeout(() => this.addedToCart.set(false), 3000);
      },
      error: () => this.addingToCart.set(false),
    });
  }

  toggleWishlist(): void {
    if (this.product()) {
      this.wishlist.toggle(this.product()!.id);
    }
  }
}
