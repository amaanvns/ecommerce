import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { ProductSummary } from '../../../core/services/catalog.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink, CurrencyPipe],
  template: `
    <a
      [routerLink]="['/products', product().slug]"
      class="group flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      <!-- Image -->
      <div class="relative aspect-square bg-gray-50 overflow-hidden">
        @if (product().image?.url) {
          <img
            [src]="product().image!.url"
            [alt]="product().image!.alt ?? product().name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        } @else {
          <div class="w-full h-full flex items-center justify-center text-gray-300">
            <svg
              width="64"
              height="64"
              fill="none"
              stroke="currentColor"
              stroke-width="1"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
          </div>
        }
        @if (hasDiscount()) {
          <span
            class="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full"
          >
            {{ discountPct() }}% OFF
          </span>
        }
        @if (auth.isAuthenticated()) {
          <button
            (click)="toggleWishlist($event)"
            class="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            [title]="wishlist.has(product().id) ? 'Remove from wishlist' : 'Add to wishlist'"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              [attr.fill]="wishlist.has(product().id) ? 'currentColor' : 'none'"
              stroke="currentColor"
              stroke-width="1.5"
              [class.text-red-500]="wishlist.has(product().id)"
              [class.text-gray-400]="!wishlist.has(product().id)"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
              />
            </svg>
          </button>
        }
      </div>

      <!-- Info -->
      <div class="p-4 flex flex-col gap-1 flex-1">
        @if (product().brand) {
          <p class="text-xs text-gray-400 uppercase tracking-wide">{{ product().brand }}</p>
        }
        <h3 class="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
          {{ product().name }}
        </h3>

        <div class="mt-auto pt-2 flex items-baseline gap-2">
          <span class="text-base font-bold text-gray-900">
            {{ +(product().minPrice ?? 0) | currency }}
          </span>
          @if (hasDiscount()) {
            <span class="text-sm text-gray-400 line-through">
              {{ +product().compareAtPrice! | currency }}
            </span>
          }
        </div>
      </div>
    </a>
  `,
})
export class ProductCardComponent {
  readonly product = input.required<ProductSummary>();
  readonly wishlist = inject(WishlistService);
  readonly auth = inject(AuthService);

  hasDiscount(): boolean {
    return (
      !!this.product().compareAtPrice && +this.product().compareAtPrice! > +this.product().minPrice!
    );
  }

  discountPct(): number {
    if (!this.hasDiscount()) return 0;
    const orig = +this.product().compareAtPrice!;
    const curr = +this.product().minPrice!;
    return Math.round(((orig - curr) / orig) * 100);
  }

  toggleWishlist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlist.toggle(this.product().id);
  }
}
