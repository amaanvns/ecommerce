import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CouponPreview {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  discount: number;
}

@Injectable({ providedIn: 'root' })
export class CouponsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  validate(code: string, subtotal: number): Observable<{ data: CouponPreview }> {
    return this.http.post<{ data: CouponPreview }>(`${this.api}/coupons/validate`, {
      code,
      subtotal,
    });
  }
}
