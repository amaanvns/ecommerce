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

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  alt: string | null;
  sortOrder: number;
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
  images: ProductImage[];
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

export interface AdminCoupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: string;
  minSubtotal: string | null;
  maxDiscount: string | null;
  usageLimit: number | null;
  usedCount: number;
  firstOrderOnly: boolean;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CouponPayload {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotal?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  firstOrderOnly?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive?: boolean;
}

export interface AdminReviewRow {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  productId: string;
  productName: string;
  productSlug: string;
  authorName: string;
  authorEmail: string;
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

export interface SalesTrendPoint {
  date: string; // YYYY-MM-DD
  revenue: number;
  orderCount: number;
}

export interface TopProductRow {
  productId: string;
  productName: string;
  productSlug: string;
  unitsSold: number;
  revenue: number;
}

export interface CategorySalesRow {
  categoryId: string;
  categoryName: string;
  revenue: number;
  unitsSold: number;
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

  addImage(productId: string, url: string, alt?: string): Observable<{ data: ProductImage }> {
    return this.http.post<{ data: ProductImage }>(`${this.api}/products/${productId}/images`, {
      url,
      alt: alt ?? '',
    });
  }

  updateImage(
    productId: string,
    imageId: string,
    data: { alt?: string | null; sortOrder?: number },
  ): Observable<{ data: ProductImage }> {
    return this.http.patch<{ data: ProductImage }>(
      `${this.api}/products/${productId}/images/${imageId}`,
      data,
    );
  }

  reorderImages(productId: string, order: string[]): Observable<{ data: ProductImage[] }> {
    return this.http.post<{ data: ProductImage[] }>(
      `${this.api}/products/${productId}/images/reorder`,
      { order },
    );
  }

  deleteImage(productId: string, imageId: string): Observable<{ data: { id: string } }> {
    return this.http.delete<{ data: { id: string } }>(
      `${this.api}/products/${productId}/images/${imageId}`,
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

  getReviews(
    page = 1,
    limit = 20,
    status?: string,
  ): Observable<{ data: AdminReviewRow[]; meta: PaginatedMeta }> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (status) params = params.set('status', status);
    return this.http.get<{ data: AdminReviewRow[]; meta: PaginatedMeta }>(`${this.api}/reviews`, {
      params,
    });
  }

  moderateReview(id: string, status: string): Observable<{ data: AdminReviewRow }> {
    return this.http.patch<{ data: AdminReviewRow }>(`${this.api}/reviews/${id}`, { status });
  }

  deleteReview(id: string): Observable<{ data: { id: string } }> {
    return this.http.delete<{ data: { id: string } }>(`${this.api}/reviews/${id}`);
  }

  getCoupons(page = 1, limit = 20): Observable<{ data: AdminCoupon[]; meta: PaginatedMeta }> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<{ data: AdminCoupon[]; meta: PaginatedMeta }>(`${this.api}/coupons`, {
      params,
    });
  }

  createCoupon(data: CouponPayload): Observable<{ data: AdminCoupon }> {
    return this.http.post<{ data: AdminCoupon }>(`${this.api}/coupons`, data);
  }

  updateCoupon(id: string, data: Partial<CouponPayload>): Observable<{ data: AdminCoupon }> {
    return this.http.patch<{ data: AdminCoupon }>(`${this.api}/coupons/${id}`, data);
  }

  deleteCoupon(id: string): Observable<{ data: { id: string } }> {
    return this.http.delete<{ data: { id: string } }>(`${this.api}/coupons/${id}`);
  }

  getSalesTrend(days = 30): Observable<{ data: SalesTrendPoint[] }> {
    const params = new HttpParams().set('days', days);
    return this.http.get<{ data: SalesTrendPoint[] }>(`${this.api}/analytics/sales-trend`, {
      params,
    });
  }

  getTopProducts(limit = 5): Observable<{ data: TopProductRow[] }> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<{ data: TopProductRow[] }>(`${this.api}/analytics/top-products`, {
      params,
    });
  }

  getSalesByCategory(): Observable<{ data: CategorySalesRow[] }> {
    return this.http.get<{ data: CategorySalesRow[] }>(`${this.api}/analytics/sales-by-category`);
  }

  exportOrdersCsv(opts?: { from?: string; to?: string; status?: 'paid' }): Observable<Blob> {
    let params = new HttpParams();
    if (opts?.from) params = params.set('from', opts.from);
    if (opts?.to) params = params.set('to', opts.to);
    if (opts?.status) params = params.set('status', opts.status);
    return this.http.get(`${this.api}/exports/orders.csv`, {
      params,
      responseType: 'blob',
    });
  }
}
