import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminStats {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
  recentOrders: AdminOrderRow[];
  ordersByStatus: { status: string; count: number }[];
}

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: string;
  placedAt: string;
  userName: string | null;
  userEmail: string | null;
}

export interface AdminProductRow {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  isPublished: boolean;
  createdAt: string;
  categoryName: string | null;
  totalStock: number;
  variantCount: number;
  minPrice: string | null;
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  attributes: Record<string, string>;
  price: string;
  compareAtPrice: string | null;
  stockQty: number;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductDetail {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  description: string | null;
  categoryId: string | null;
  isPublished: boolean;
  createdAt: string;
  variants: ProductVariant[];
}

export interface VariantPayload {
  sku: string;
  attributes: Record<string, string>;
  price: string;
  compareAtPrice?: string | null;
  stockQty: number;
  lowStockThreshold?: number;
}

export interface ProductPayload {
  name: string;
  slug: string;
  brand?: string;
  description?: string;
  categoryId?: string | null;
  isPublished?: boolean;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isBlocked: boolean;
  createdAt: string;
  orderCount: number;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/admin`;

  getStats(): Observable<{ data: AdminStats }> {
    return this.http.get<{ data: AdminStats }>(`${this.api}/stats`);
  }

  getOrders(
    page = 1,
    limit = 20,
    status?: string,
  ): Observable<{ data: AdminOrderRow[]; meta: PaginatedMeta }> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (status) params = params.set('status', status);
    return this.http.get<{ data: AdminOrderRow[]; meta: PaginatedMeta }>(`${this.api}/orders`, {
      params,
    });
  }

  updateOrderStatus(id: string, status: string): Observable<{ data: AdminOrderRow }> {
    return this.http.patch<{ data: AdminOrderRow }>(`${this.api}/orders/${id}/status`, { status });
  }

  getProducts(
    page = 1,
    limit = 20,
    q?: string,
  ): Observable<{ data: AdminProductRow[]; meta: PaginatedMeta }> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (q) params = params.set('q', q);
    return this.http.get<{ data: AdminProductRow[]; meta: PaginatedMeta }>(`${this.api}/products`, {
      params,
    });
  }

  createProduct(data: ProductPayload): Observable<{ data: AdminProductDetail }> {
    return this.http.post<{ data: AdminProductDetail }>(`${this.api}/products`, data);
  }

  getProduct(id: string): Observable<{ data: AdminProductDetail }> {
    return this.http.get<{ data: AdminProductDetail }>(`${this.api}/products/${id}`);
  }

  updateProduct(
    id: string,
    data: Partial<ProductPayload>,
  ): Observable<{ data: AdminProductDetail }> {
    return this.http.patch<{ data: AdminProductDetail }>(`${this.api}/products/${id}`, data);
  }

  deleteProduct(id: string): Observable<{ data: { id: string } }> {
    return this.http.delete<{ data: { id: string } }>(`${this.api}/products/${id}`);
  }

  addVariant(productId: string, data: VariantPayload): Observable<{ data: ProductVariant }> {
    return this.http.post<{ data: ProductVariant }>(
      `${this.api}/products/${productId}/variants`,
      data,
    );
  }

  updateVariant(
    productId: string,
    variantId: string,
    data: Partial<VariantPayload>,
  ): Observable<{ data: ProductVariant }> {
    return this.http.patch<{ data: ProductVariant }>(
      `${this.api}/products/${productId}/variants/${variantId}`,
      data,
    );
  }

  deleteVariant(productId: string, variantId: string): Observable<{ data: { id: string } }> {
    return this.http.delete<{ data: { id: string } }>(
      `${this.api}/products/${productId}/variants/${variantId}`,
    );
  }

  getUsers(
    page = 1,
    limit = 20,
    q?: string,
  ): Observable<{ data: AdminUserRow[]; meta: PaginatedMeta }> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (q) params = params.set('q', q);
    return this.http.get<{ data: AdminUserRow[]; meta: PaginatedMeta }>(`${this.api}/users`, {
      params,
    });
  }

  toggleBlockUser(id: string): Observable<{ data: { id: string; isBlocked: boolean } }> {
    return this.http.patch<{ data: { id: string; isBlocked: boolean } }>(
      `${this.api}/users/${id}/block`,
      {},
    );
  }
}
