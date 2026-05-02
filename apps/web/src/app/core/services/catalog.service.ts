import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  children: Category[];
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  categoryId: string | null;
  image: { url: string; alt: string | null } | null;
  minPrice: string | null;
  maxPrice: string | null;
  compareAtPrice: string | null;
}

export interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  price: string;
  compareAtPrice: string | null;
  stockQty: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
  category: { id: string; name: string; slug: string } | null;
}

export interface ProductListMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductListQuery {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc';
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getCategories(): Observable<{ data: Category[] }> {
    return this.http.get<{ data: Category[] }>(`${this.api}/categories`);
  }

  getProducts(
    query: ProductListQuery = {},
  ): Observable<{ data: ProductSummary[]; meta: ProductListMeta }> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<{ data: ProductSummary[]; meta: ProductListMeta }>(
      `${this.api}/products`,
      { params },
    );
  }

  getProduct(slug: string): Observable<{ data: ProductDetail }> {
    return this.http.get<{ data: ProductDetail }>(`${this.api}/products/${slug}`);
  }
}
