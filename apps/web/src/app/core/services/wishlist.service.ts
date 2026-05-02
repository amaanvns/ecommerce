import { effect, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ProductSummary } from './catalog.service';

export interface WishlistItem extends ProductSummary {
  wishlistItemId: string;
}

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = environment.apiUrl;

  readonly productIds = signal<Set<string>>(new Set());
  readonly items = signal<WishlistItem[]>([]);

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.load();
      } else {
        this.productIds.set(new Set());
        this.items.set([]);
      }
    });
  }

  has(productId: string): boolean {
    return this.productIds().has(productId);
  }

  load(): void {
    this.http
      .get<{
        data: Array<{
          id: string;
          productId: string;
          name: string;
          slug: string;
          brand: string | null;
          image: { url: string; alt: string | null } | null;
          minPrice: string | null;
          compareAtPrice: string | null;
        }>;
      }>(`${this.api}/wishlist`)
      .subscribe({
        next: (res) => {
          this.productIds.set(new Set(res.data.map((i) => i.productId)));
          this.items.set(
            res.data.map((i) => ({
              wishlistItemId: i.id,
              id: i.productId,
              name: i.name,
              slug: i.slug,
              brand: i.brand,
              categoryId: null,
              image: i.image,
              minPrice: i.minPrice,
              maxPrice: i.minPrice,
              compareAtPrice: i.compareAtPrice,
            })),
          );
        },
      });
  }

  toggle(productId: string): void {
    if (this.has(productId)) {
      this.http.delete(`${this.api}/wishlist/${productId}`).subscribe(() => {
        this.productIds.update((s) => {
          const next = new Set(s);
          next.delete(productId);
          return next;
        });
        this.items.update((list) => list.filter((i) => i.id !== productId));
      });
    } else {
      this.http.post(`${this.api}/wishlist`, { productId }).subscribe(() => {
        this.productIds.update((s) => new Set([...s, productId]));
        this.load();
      });
    }
  }
}
