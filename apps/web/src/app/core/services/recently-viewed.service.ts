import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ProductSummary } from './catalog.service';

const KEY = 'recentlyViewed';
const MAX = 8;

/** Tracks recently viewed products in localStorage (browser only, SSR-safe). */
@Injectable({ providedIn: 'root' })
export class RecentlyViewedService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly items = signal<ProductSummary[]>(this.read());

  private read(): ProductSummary[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as ProductSummary[]) : [];
    } catch {
      return [];
    }
  }

  /** Record a viewed product — moves it to the front, de-duplicated, capped. */
  record(product: ProductSummary): void {
    if (!this.isBrowser) return;
    const next = [product, ...this.items().filter((p) => p.id !== product.id)].slice(0, MAX);
    this.items.set(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage full / disabled — non-fatal
    }
  }

  /** Products other than the given id (e.g. exclude the one being viewed). */
  others(excludeId: string): ProductSummary[] {
    return this.items().filter((p) => p.id !== excludeId);
  }
}
