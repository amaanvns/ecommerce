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
    <a [routerLink]="['/products', product().slug]" class="group block">
      <!-- Image -->
      <div class="relative aspect-[4/5] bg-ink-50 hover-zoom mb-5">
        @if (product().image?.url) {
          <img
            [src]="product().image!.url"
            [srcset]="srcset()"
            sizes="(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 50vw"
            [alt]="product().image!.alt ?? product().name"
            class="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        } @else {
          <div class="w-full h-full flex items-center justify-center text-ink-300">
            <svg
              width="36"
              height="36"
              fill="none"
              stroke="currentColor"
              stroke-width="1"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159"
              />
            </svg>
          </div>
        }

        <button
          type="button"
          (click)="toggleWishlist($event)"
          class="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-paper/90 backdrop-blur opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity hover:bg-paper"
          [title]="wishlist.has(product().id) ? 'Remove from saved' : 'Save'"
          [attr.aria-label]="
            (wishlist.has(product().id) ? 'Remove ' : 'Save ') +
            product().name +
            (wishlist.has(product().id) ? ' from saved' : ' to saved')
          "
          [attr.aria-pressed]="wishlist.has(product().id)"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            [attr.fill]="wishlist.has(product().id) ? 'currentColor' : 'none'"
            stroke="currentColor"
            stroke-width="1.5"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
            />
          </svg>
        </button>
      </div>

      <!-- Info — minimal -->
      <div class="space-y-1">
        <h3 class="text-base text-ink leading-snug">
          {{ product().name }}
        </h3>
        @if (product().brand) {
          <p class="text-sm text-ink-400">{{ product().brand }}</p>
        }
        <p class="text-sm text-ink tabular pt-1">
          @if (product().minPrice !== null) {
            {{ +product().minPrice! | currency: 'INR' : 'symbol' : '1.0-0' }}
            @if (hasDiscount()) {
              <span class="ml-2 text-ink-400 line-through text-xs">
                {{ +product().compareAtPrice! | currency: 'INR' : 'symbol' : '1.0-0' }}
              </span>
            }
          } @else {
            <span class="text-ink-400">Price on request</span>
          }
        </p>
      </div>
    </a>
  `,
})
export class ProductCardComponent {
  readonly product = input.required<ProductSummary>();
  readonly wishlist = inject(WishlistService);
  readonly auth = inject(AuthService);

  hasDiscount(): boolean {
    const { compareAtPrice, minPrice } = this.product();
    return minPrice !== null && !!compareAtPrice && +compareAtPrice > +minPrice;
  }

  /**
   * Build a responsive srcset for Unsplash-hosted product images. Unsplash supports
   * width-based query params, so we just swap the `w=` value. For non-Unsplash
   * URLs, fall back to the original.
   */
  srcset(): string {
    const url = this.product().image?.url ?? '';
    if (!url.includes('images.unsplash.com')) return '';
    const swap = (w: number) => url.replace(/([?&])w=\d+/, `$1w=${w}`);
    return [`${swap(400)} 400w`, `${swap(600)} 600w`, `${swap(900)} 900w`].join(', ');
  }

  toggleWishlist(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.wishlist.toggle(this.product());
  }
}
