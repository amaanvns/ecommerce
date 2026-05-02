import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-cart-drawer',
  imports: [RouterLink, CurrencyPipe],
  template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/40 z-40 transition-opacity" (click)="cart.close()"></div>

    <!-- Drawer panel -->
    <div class="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 class="text-lg font-semibold text-gray-900">
          Your Cart
          @if (cart.count() > 0) {
            <span class="ml-2 text-sm font-normal text-gray-400">({{ cart.count() }} items)</span>
          }
        </h2>
        <button
          (click)="cart.close()"
          class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Items list -->
      <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        @if (cart.loading()) {
          @for (_ of [1, 2, 3]; track $index) {
            <div class="flex gap-3 animate-pulse">
              <div class="w-16 h-16 rounded-lg bg-gray-200 shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                <div class="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          }
        }

        @if (!cart.loading() && cart.items().length === 0) {
          <div class="flex flex-col items-center justify-center h-full py-20 text-gray-400">
            <svg
              width="56"
              height="56"
              fill="none"
              stroke="currentColor"
              stroke-width="1"
              viewBox="0 0 24 24"
              class="mb-4"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
              />
            </svg>
            <p class="font-medium text-gray-500">Your cart is empty</p>
            <button
              (click)="cart.close()"
              routerLink="/products"
              class="mt-4 text-indigo-600 hover:underline text-sm"
            >
              Browse products
            </button>
          </div>
        }

        @for (item of cart.items(); track item.id) {
          <div class="flex gap-3">
            <!-- Image -->
            <a
              [routerLink]="['/products', item.productSlug]"
              (click)="cart.close()"
              class="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-50 border border-gray-100"
            >
              @if (item.image) {
                <img
                  [src]="item.image.url"
                  [alt]="item.image.alt ?? item.productName"
                  class="w-full h-full object-cover"
                />
              }
            </a>

            <!-- Details -->
            <div class="flex-1 min-w-0">
              <a
                [routerLink]="['/products', item.productSlug]"
                (click)="cart.close()"
                class="text-sm font-medium text-gray-900 hover:text-indigo-600 line-clamp-1 transition-colors"
                >{{ item.productName }}</a
              >
              @if (item.attributes && objectKeys(item.attributes).length > 0) {
                <p class="text-xs text-gray-400 mt-0.5">
                  {{ formatAttrs(item.attributes) }}
                </p>
              }
              <div class="flex items-center justify-between mt-2">
                <!-- Qty controls -->
                <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    (click)="decrement(item.id, item.qty)"
                    class="px-2 py-1 text-gray-500 hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    −
                  </button>
                  <span
                    class="px-3 py-1 text-sm font-medium text-gray-900 border-x border-gray-200 min-w-[2rem] text-center"
                    >{{ item.qty }}</span
                  >
                  <button
                    (click)="increment(item.id, item.qty, item.stockQty)"
                    class="px-2 py-1 text-gray-500 hover:bg-gray-50 transition-colors text-sm font-medium"
                    [disabled]="item.qty >= item.stockQty"
                  >
                    +
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-gray-900">
                    {{ item.qty * +item.priceSnapshot | currency }}
                  </span>
                  <button
                    (click)="remove(item.id)"
                    class="text-gray-300 hover:text-red-400 transition-colors"
                    title="Remove"
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Footer -->
      @if (cart.items().length > 0) {
        <div class="border-t border-gray-100 px-5 py-4 space-y-4">
          <div class="flex items-center justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span class="text-lg font-bold text-gray-900">{{ cart.total() | currency }}</span>
          </div>
          <p class="text-xs text-gray-400">Shipping and taxes calculated at checkout</p>
          <button
            class="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Proceed to Checkout
          </button>
          <button
            (click)="cart.close()"
            routerLink="/products"
            class="w-full text-center text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      }
    </div>
  `,
})
export class CartDrawerComponent {
  readonly cart = inject(CartService);

  readonly objectKeys = Object.keys;

  formatAttrs(attrs: Record<string, string>): string {
    return Object.entries(attrs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
  }

  increment(itemId: string, qty: number, maxStock: number): void {
    if (qty >= maxStock) return;
    this.cart.updateQty(itemId, qty + 1).subscribe();
  }

  decrement(itemId: string, qty: number): void {
    if (qty <= 1) {
      this.cart.removeItem(itemId).subscribe();
    } else {
      this.cart.updateQty(itemId, qty - 1).subscribe();
    }
  }

  remove(itemId: string): void {
    this.cart.removeItem(itemId).subscribe();
  }
}
