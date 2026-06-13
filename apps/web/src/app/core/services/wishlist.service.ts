import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { ProductSummary } from './catalog.service';

export interface WishlistItem extends ProductSummary {
  wishlistItemId: string;
}

const GUEST_KEY = 'guestWishlist';

/**
 * Wishlist that works for guests too. Logged-in users are backed by the server;
 * guests are backed by localStorage (storing enough to render the wishlist page).
 * On login the guest wishlist merges into the account.
 */
@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = environment.apiUrl;
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly productIds = signal<Set<string>>(new Set());
  readonly items = signal<WishlistItem[]>([]);

  constructor() {
    effect(() => {
      const authed = this.auth.isAuthenticated();
      if (!this.isBrowser) return;
      if (authed) {
        this.mergeGuestThenLoad();
      } else {
        this.loadGuest();
      }
    });
  }

  has(productId: string): boolean {
    return this.productIds().has(productId);
  }

  toggle(product: ProductSummary): void {
    if (this.auth.isAuthenticated()) {
      this.toggleServer(product.id);
    } else {
      this.toggleGuest(product);
    }
  }

  // ── Server-backed (logged-in) ──────────────────────────────────────────────
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

  private toggleServer(productId: string): void {
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

  private mergeGuestThenLoad(): void {
    const guest = this.readGuest();
    if (guest.length === 0) {
      this.load();
      return;
    }
    // Push each guest item to the server (idempotent), then clear local + reload
    let remaining = guest.length;
    for (const p of guest) {
      this.http.post(`${this.api}/wishlist`, { productId: p.id }).subscribe({
        next: () => {
          if (--remaining === 0) this.finishMerge();
        },
        error: () => {
          if (--remaining === 0) this.finishMerge();
        },
      });
    }
  }

  private finishMerge(): void {
    this.writeGuest([]);
    this.load();
  }

  // ── localStorage-backed (guest) ─────────────────────────────────────────────
  private loadGuest(): void {
    const guest = this.readGuest();
    this.productIds.set(new Set(guest.map((p) => p.id)));
    this.items.set(guest.map((p) => ({ ...p, wishlistItemId: p.id })));
  }

  private toggleGuest(product: ProductSummary): void {
    const current = this.readGuest();
    const exists = current.some((p) => p.id === product.id);
    const next = exists ? current.filter((p) => p.id !== product.id) : [{ ...product }, ...current];
    this.writeGuest(next);
    this.loadGuest();
  }

  private readGuest(): ProductSummary[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(GUEST_KEY);
      return raw ? (JSON.parse(raw) as ProductSummary[]) : [];
    } catch {
      return [];
    }
  }

  private writeGuest(items: ProductSummary[]): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(GUEST_KEY, JSON.stringify(items));
    } catch {
      // storage disabled — non-fatal
    }
  }
}
