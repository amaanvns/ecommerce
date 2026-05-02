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
  total: string;
  currency: string;
  shippingAddress: Record<string, string>;
  notes: string | null;
  placedAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
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
}
