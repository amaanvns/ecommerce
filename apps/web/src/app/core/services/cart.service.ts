import { computed, effect, inject, Injectable, signal } from '@angular/core';
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

  readonly items = signal<CartItem[]>([]);
  readonly isOpen = signal(false);
  readonly loading = signal(false);

  readonly count = computed(() => this.items().reduce((sum, i) => sum + i.qty, 0));
  readonly total = computed(() =>
    this.items().reduce((sum, i) => sum + i.qty * +i.priceSnapshot, 0),
  );

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.load();
      } else {
        this.items.set([]);
        this.isOpen.set(false);
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
