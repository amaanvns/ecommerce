import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-cart-drawer',
  imports: [RouterLink, CurrencyPipe],
  template: `
    <div
      class="fixed inset-0 bg-ink/50 z-40 animate-fade-in backdrop-blur-sm"
      (click)="cart.close()"
    ></div>

    <aside
      class="fixed right-0 top-0 h-full w-full max-w-md bg-paper z-50 flex flex-col animate-fade-in"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-8 py-6 border-b border-ink-200">
        <h2 class="text-xl font-light tracking-tight">
          Your bag
          @if (cart.count() > 0) {
            <span class="text-ink-400 ml-1 tabular">({{ cart.count() }})</span>
          }
        </h2>
        <button
          (click)="cart.close()"
          class="text-sm text-ink-500 hover:text-ink transition-colors"
        >
          Close
        </button>
      </div>

      <!-- Items -->
      <div class="flex-1 overflow-y-auto px-8 py-6 space-y-6">
        @if (cart.loading()) {
          @for (_ of [1, 2, 3]; track $index) {
            <div class="flex gap-4 animate-pulse">
              <div class="w-20 h-24 bg-ink-100 shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="h-3 bg-ink-100 w-3/4"></div>
                <div class="h-3 bg-ink-100 w-1/2"></div>
                <div class="h-3 bg-ink-100 w-1/4"></div>
              </div>
            </div>
          }
        }

        @if (!cart.loading() && cart.items().length === 0) {
          <div class="flex flex-col items-center justify-center h-full text-center pt-16">
            <p class="text-3xl font-light tracking-tight mb-3">Your bag is empty</p>
            <p class="text-ink-500 mb-8 max-w-xs">Find something you'll love.</p>
            <a routerLink="/products" (click)="cart.close()" class="btn-outline">
              Continue Shopping
            </a>
          </div>
        }

        @for (item of cart.items(); track item.id) {
          <div class="flex gap-4 pb-6 border-b border-ink-100 last:border-0">
            <a
              [routerLink]="['/products', item.productSlug]"
              (click)="cart.close()"
              class="shrink-0 w-20 h-24 overflow-hidden bg-ink-50"
            >
              @if (item.image) {
                <img
                  [src]="item.image.url"
                  [alt]="item.image.alt ?? item.productName"
                  class="w-full h-full object-cover"
                />
              }
            </a>

            <div class="flex-1 min-w-0">
              <a
                [routerLink]="['/products', item.productSlug]"
                (click)="cart.close()"
                class="text-base leading-snug line-clamp-1 hover:text-ink-500 transition-colors"
                >{{ item.productName }}</a
              >
              @if (item.attributes && objectKeys(item.attributes).length > 0) {
                <p class="text-sm text-ink-500 mt-1">
                  {{ formatAttrs(item.attributes) }}
                </p>
              }
              <div class="flex items-center justify-between mt-3">
                <div class="flex items-center border border-ink-200 rounded-full">
                  <button
                    (click)="decrement(item.id, item.qty)"
                    class="w-8 h-8 hover:text-ink-500 transition-colors"
                  >
                    −
                  </button>
                  <span class="w-8 text-center text-sm tabular">{{ item.qty }}</span>
                  <button
                    (click)="increment(item.id, item.qty, item.stockQty)"
                    class="w-8 h-8 hover:text-ink-500 transition-colors disabled:opacity-30"
                    [disabled]="item.qty >= item.stockQty"
                  >
                    +
                  </button>
                </div>

                <div class="flex items-center gap-3">
                  <span class="text-sm tabular">
                    {{ item.qty * +item.priceSnapshot | currency }}
                  </span>
                  <button
                    (click)="remove(item.id)"
                    class="text-sm text-ink-400 hover:text-ink transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Footer -->
      @if (cart.items().length > 0) {
        <div class="border-t border-ink-200 px-8 py-6 space-y-4">
          <div class="flex items-baseline justify-between">
            <span class="text-sm">Subtotal</span>
            <span class="text-xl font-light tabular">{{ cart.total() | currency }}</span>
          </div>
          <p class="text-sm text-ink-400">Shipping &amp; taxes calculated at checkout</p>
          <button (click)="goToCheckout()" class="btn-primary w-full">Checkout</button>
          <button
            (click)="cart.close()"
            routerLink="/products"
            class="w-full text-center text-sm text-ink-500 hover:text-ink transition-colors"
          >
            Continue shopping
          </button>
        </div>
      }
    </aside>
  `,
})
export class CartDrawerComponent {
  readonly cart = inject(CartService);
  private readonly router = inject(Router);

  readonly objectKeys = Object.keys;

  goToCheckout(): void {
    this.cart.close();
    this.router.navigate(['/checkout']);
  }

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
