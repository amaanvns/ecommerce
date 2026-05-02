import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ShippingAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CreateOrderResponse {
  data: {
    orderId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    keyId: string;
  };
}

export interface VerifyPaymentResponse {
  data: { orderId: string; orderNumber: string };
}

// Razorpay global type (loaded via script tag)
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpayPaymentResponse) => void;
  modal?: { ondismiss?: () => void };
}

export interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  createOrder(shippingAddress: ShippingAddress, notes?: string): Observable<CreateOrderResponse> {
    return this.http.post<CreateOrderResponse>(`${this.api}/checkout/create-order`, {
      shippingAddress,
      notes,
    });
  }

  verifyPayment(
    orderId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Observable<VerifyPaymentResponse> {
    return this.http.post<VerifyPaymentResponse>(`${this.api}/checkout/verify-payment`, {
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
  }

  loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.body.appendChild(script);
    });
  }

  openRazorpay(options: RazorpayOptions): void {
    const rzp = new window.Razorpay(options);
    rzp.open();
  }
}
