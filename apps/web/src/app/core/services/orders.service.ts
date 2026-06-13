import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: string;
  discount: string;
  total: string;
  currency: string;
  couponId: string | null;
  shippingAddress: Record<string, string>;
  notes: string | null;
  placedAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  variantId: string | null;
  productNameSnapshot: string;
  skuSnapshot: string | null;
  qty: number;
  unitPrice: string;
  lineTotal: string;
}

export interface OrderDetail extends Order {
  items: OrderItem[];
  payment: {
    gateway: string;
    gatewayRef: string | null;
    amount: string;
    status: string;
    createdAt: string;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  getOrders(): Observable<{ data: Order[] }> {
    return this.http.get<{ data: Order[] }>(`${this.api}/orders`);
  }

  getOrder(id: string): Observable<{ data: OrderDetail }> {
    return this.http.get<{ data: OrderDetail }>(`${this.api}/orders/${id}`);
  }

  /** Public lookup for a guest order (no account) by id + the email used at checkout. */
  getGuestOrder(id: string, email: string): Observable<{ data: OrderDetail }> {
    return this.http.get<{ data: OrderDetail }>(`${this.api}/orders/guest/${id}`, {
      params: { email },
    });
  }

  /** Public "track order" for guests by human order number + email. */
  trackGuestOrder(orderNumber: string, email: string): Observable<{ data: OrderDetail }> {
    return this.http.get<{ data: OrderDetail }>(`${this.api}/orders/track`, {
      params: { orderNumber, email },
    });
  }

  /** Link a past guest order to the signed-in account (order number + email as proof). */
  claimOrder(orderNumber: string, email: string): Observable<{ data: Order }> {
    return this.http.post<{ data: Order }>(`${this.api}/orders/claim`, { orderNumber, email });
  }

  cancelOrder(id: string): Observable<{ data: Order }> {
    return this.http.post<{ data: Order }>(`${this.api}/orders/${id}/cancel`, {});
  }

  requestReturn(id: string): Observable<{ data: Order }> {
    return this.http.post<{ data: Order }>(`${this.api}/orders/${id}/return-request`, {});
  }
}
