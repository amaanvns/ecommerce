import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WishlistService } from '../../core/services/wishlist.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-wishlist',
  imports: [RouterLink, ProductCardComponent],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">My Wishlist</h1>

      @if (wishlist.items().length === 0) {
        <div class="text-center py-24 text-gray-400">
          <svg
            class="mx-auto mb-4 w-14 h-14"
            width="56"
            height="56"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
            />
          </svg>
          <p class="text-lg font-medium text-gray-500">Your wishlist is empty</p>
          <a
            routerLink="/products"
            class="mt-4 inline-block text-indigo-600 hover:underline text-sm"
          >
            Discover products
          </a>
        </div>
      } @else {
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          @for (item of wishlist.items(); track item.id) {
            <div class="relative">
              <app-product-card [product]="item" />
              <button
                (click)="wishlist.toggle(item.id)"
                class="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-sm hover:bg-red-50 transition-colors"
                title="Remove from wishlist"
              >
                <svg
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="text-red-500"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"
                  />
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
