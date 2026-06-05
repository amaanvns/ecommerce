import { computed, effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface CartItem {
  id: string;
  qty: number;
  priceSnapshot: string;
  variantId: string;
  sku: string;
  attributes: Record<string, string>;
  price: string;
  compareAtPrice: string | null;
  stockQty: number;
  productId: string;
  productName: string;
  productSlug: string;
  productBrand: string | null;
  codAvailable: boolean;
  image: { url: string; alt: string | null } | null;
}

interface CartResponse {
  data: { id: string; items: CartItem[]; total: string };
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = environment.apiUrl;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly items = signal<CartItem[]>([]);
  readonly isOpen = signal(false);
  readonly loading = signal(false);

  readonly count = computed(() => this.items().reduce((sum, i) => sum + i.qty, 0));
  readonly total = computed(() =>
    this.items().reduce((sum, i) => sum + i.qty * +i.priceSnapshot, 0),
  );

  constructor() {
    effect(() => {
      const authed = this.auth.isAuthenticated();
      // Only touch the cart in the browser — avoids SSR HTTP calls / orphan guest carts.
      if (!this.isBrowser) return;
      // Guests have a cookie-backed cart too; on login we merge it into the user cart.
      if (authed) {
        this.merge();
      } else {
        this.isOpen.set(false);
        this.load();
      }
    });
  }

  load(): void {
    this.loading.set(true);
    this.http.get<CartResponse>(`${this.api}/cart`).subscribe({
      next: (res) => {
        this.items.set(res.data.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Fold any guest (cookie) cart into the logged-in user's cart, then show it. */
  merge(): void {
    this.loading.set(true);
    this.http.post<CartResponse>(`${this.api}/cart/merge`, {}).subscribe({
      next: (res) => {
        this.items.set(res.data.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.load();
      },
    });
  }

  open(): void {
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  addItem(variantId: string, qty = 1): Observable<CartResponse> {
    return this.http
      .post<CartResponse>(`${this.api}/cart/items`, { variantId, qty })
      .pipe(tap((res) => this.items.set(res.data.items)));
  }

  updateQty(itemId: string, qty: number): Observable<CartResponse> {
    return this.http
      .patch<CartResponse>(`${this.api}/cart/items/${itemId}`, { qty })
      .pipe(tap((res) => this.items.set(res.data.items)));
  }

  removeItem(itemId: string): Observable<CartResponse> {
    return this.http
      .delete<CartResponse>(`${this.api}/cart/items/${itemId}`)
      .pipe(tap((res) => this.items.set(res.data.items)));
  }

  clear(): Observable<CartResponse> {
    return this.http
      .delete<CartResponse>(`${this.api}/cart`)
      .pipe(tap((res) => this.items.set(res.data.items)));
  }
}
