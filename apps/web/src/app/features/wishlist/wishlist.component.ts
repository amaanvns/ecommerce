import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WishlistService } from '../../core/services/wishlist.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, ProductCardComponent],
  template: `
    <section class="container-edge pt-20 pb-12 lg:pt-28 lg:pb-16">
      <h1 class="text-4xl md:text-5xl font-light tracking-tighter">Saved</h1>
      @if (wishlist.items().length > 0) {
        <p class="text-sm text-ink-500 mt-3 tabular">
          {{ wishlist.items().length }} {{ wishlist.items().length === 1 ? 'item' : 'items' }}
        </p>
      }
    </section>

    <div class="container-edge pb-24">
      @if (wishlist.items().length === 0) {
        <div class="text-center py-32">
          <p class="text-3xl font-light tracking-tight mb-3">Nothing saved yet</p>
          <p class="text-ink-500 mb-8 max-w-md mx-auto">
            Save the things you love to come back to later.
          </p>
          <a routerLink="/products" class="btn-outline">Discover Products</a>
        </div>
      } @else {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-16">
          @for (item of wishlist.items(); track item.id) {
            <div class="relative">
              <app-product-card [product]="item" />
              <button
                (click)="wishlist.toggle(item.id)"
                class="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-paper/95 backdrop-blur hover:bg-paper transition-colors"
                [attr.aria-label]="'Remove ' + item.name + ' from saved'"
              >
                <svg
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class WishlistComponent {
  readonly wishlist = inject(WishlistService);
}
