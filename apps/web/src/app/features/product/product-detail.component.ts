import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { CatalogService, ProductDetail, ProductVariant } from '../../core/services/catalog.service';
import { CartService } from '../../core/services/cart.service';
import { WishlistService } from '../../core/services/wishlist.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, CurrencyPipe],
  template: `
    @if (loading()) {
      <!-- Skeleton -->
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div class="aspect-square bg-gray-200 rounded-2xl"></div>
          <div class="space-y-4">
            <div class="h-4 bg-gray-200 rounded w-1/4"></div>
            <div class="h-8 bg-gray-200 rounded w-3/4"></div>
            <div class="h-6 bg-gray-200 rounded w-1/3"></div>
            <div class="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    }

    @if (!loading() && !product()) {
      <div class="max-w-6xl mx-auto px-4 py-24 text-center text-gray-400">
        <p class="text-xl font-medium">Product not found</p>
        <a routerLink="/products" class="mt-4 inline-block text-indigo-600 hover:underline text-sm">
          Back to products
        </a>
      </div>
    }

    @if (!loading() && product()) {
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <a routerLink="/" class="hover:text-indigo-600 transition-colors">Home</a>
          <span>/</span>
          <a routerLink="/products" class="hover:text-indigo-600 transition-colors">Products</a>
          @if (product()!.category) {
            <span>/</span>
            <a
              [routerLink]="['/products']"
              [queryParams]="{ category: product()!.category!.slug }"
              class="hover:text-indigo-600 transition-colors"
              >{{ product()!.category!.name }}</a
            >
          }
          <span>/</span>
          <span class="text-gray-600 truncate max-w-xs">{{ product()!.name }}</span>
        </nav>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
          <!-- Image gallery -->
          <div class="space-y-3">
            <div
              class="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100"
            >
              <img
                [src]="activeImage()"
                [alt]="product()!.name"
                class="w-full h-full object-cover"
              />
            </div>
            @if (product()!.images.length > 1) {
              <div class="flex gap-2 overflow-x-auto pb-1">
                @for (img of product()!.images; track img.id) {
                  <button
                    (click)="activeImageIdx.set($index)"
                    class="shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors"
                    [class.border-indigo-500]="activeImageIdx() === $index"
                    [class.border-gray-200]="activeImageIdx() !== $index"
                  >
                    <img
                      [src]="img.url"
                      [alt]="img.alt ?? product()!.name"
                      class="w-full h-full object-cover"
                    />
                  </button>
                }
              </div>
            }
          </div>

          <!-- Product info -->
          <div class="flex flex-col gap-5">
            @if (product()!.brand) {
              <p class="text-sm text-gray-400 uppercase tracking-widest font-medium">
                {{ product()!.brand }}
              </p>
            }
            <h1 class="text-3xl font-bold text-gray-900 leading-tight">{{ product()!.name }}</h1>

            <!-- Price -->
            <div class="flex items-baseline gap-3">
              <span class="text-2xl font-bold text-gray-900">
                {{ +selectedVariant()!.price | currency }}
              </span>
              @if (selectedVariant()!.compareAtPrice) {
                <span class="text-lg text-gray-400 line-through">
                  {{ +selectedVariant()!.compareAtPrice! | currency }}
                </span>
                <span
                  class="text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full"
                >
                  {{ savingsPct() }}% OFF
                </span>
              }
            </div>

            <!-- Variant selectors -->
            @for (attr of attrKeys(); track attr) {
              <div>
                <p class="text-sm font-semibold text-gray-700 mb-2">
                  {{ attr }}:
                  <span class="font-normal text-gray-500">{{ selectedAttrs()[attr] }}</span>
                </p>
                <div class="flex flex-wrap gap-2">
                  @for (val of attrValues()[attr]; track val) {
                    <button
                      (click)="selectAttr(attr, val)"
                      class="px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors"
                      [class.border-indigo-600]="selectedAttrs()[attr] === val"
                      [class.bg-indigo-50]="selectedAttrs()[attr] === val"
                      [class.text-indigo-700]="selectedAttrs()[attr] === val"
                      [class.border-gray-200]="selectedAttrs()[attr] !== val"
                      [class.text-gray-600]="selectedAttrs()[attr] !== val"
                      [class.hover:border-gray-400]="selectedAttrs()[attr] !== val"
                    >
                      {{ val }}
                    </button>
                  }
                </div>
              </div>
            }

            <!-- Stock -->
            <div class="flex items-center gap-2 text-sm">
              @if ((selectedVariant()?.stockQty ?? 0) > 0) {
                <span class="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                @if ((selectedVariant()?.stockQty ?? 0) <= 5) {
                  <span class="text-orange-600 font-medium"
                    >Only {{ selectedVariant()!.stockQty }} left!</span
                  >
                } @else {
                  <span class="text-green-700">In stock</span>
                }
              } @else {
                <span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span>
                <span class="text-red-600">Out of stock</span>
              }
            </div>

            <!-- Add to cart + wishlist -->
            <div class="flex gap-3 mt-2">
              @if (auth.isAuthenticated()) {
                <button
                  (click)="addToCart()"
                  class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  [disabled]="(selectedVariant()?.stockQty ?? 0) === 0 || addingToCart()"
                >
                  @if (addingToCart()) {
                    <svg
                      class="animate-spin w-4 h-4"
                      width="16"
                      height="16"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      ></circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      ></path>
                    </svg>
                    Adding…
                  } @else {
                    Add to Cart
                  }
                </button>
                <button
                  (click)="toggleWishlist()"
                  class="p-3 border rounded-xl transition-colors"
                  [class.border-red-300]="wishlist.has(product()!.id)"
                  [class.text-red-500]="wishlist.has(product()!.id)"
                  [class.bg-red-50]="wishlist.has(product()!.id)"
                  [class.border-gray-200]="!wishlist.has(product()!.id)"
                  [class.hover:border-indigo-400]="!wishlist.has(product()!.id)"
                  [class.hover:text-indigo-600]="!wishlist.has(product()!.id)"
                  [title]="
                    wishlist.has(product()!.id) ? 'Remove from wishlist' : 'Save to wishlist'
                  "
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    [attr.fill]="wishlist.has(product()!.id) ? 'currentColor' : 'none'"
                    stroke="currentColor"
                    stroke-width="1.5"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                    />
                  </svg>
                </button>
              } @else {
                <a
                  routerLink="/auth/login"
                  class="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors text-center"
                  >Sign in to Add to Cart</a
                >
              }
            </div>

            @if (addedToCart()) {
              <div
                class="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg"
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Added to cart!
                <button (click)="cartService.open()" class="ml-auto font-semibold hover:underline">
                  View cart
                </button>
              </div>
            }

            <!-- Description -->
            @if (product()!.description) {
              <div class="pt-4 border-t border-gray-100">
                <h3 class="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {{ product()!.description }}
                </p>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class ProductDetailComponent implements OnInit {
  private readonly catalogService = inject(CatalogService);
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
          // Pre-select first value of each attribute
          const initial: Record<string, string> = {};
          for (const [k, vals] of Object.entries(this.attrValues())) {
            initial[k] = vals[0];
          }
          this.selectedAttrs.set(initial);
        },
        error: () => {
          this.product.set(null);
          this.loading.set(false);
        },
      });
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
