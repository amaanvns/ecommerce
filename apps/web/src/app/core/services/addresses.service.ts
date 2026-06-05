import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Address {
  id: string;
  label: string | null;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

export interface AddressPayload {
  label?: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AddressesService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(): Observable<{ data: Address[] }> {
    return this.http.get<{ data: Address[] }>(`${this.api}/addresses`);
  }

  create(payload: AddressPayload): Observable<{ data: Address }> {
    return this.http.post<{ data: Address }>(`${this.api}/addresses`, payload);
  }

  update(id: string, payload: Partial<AddressPayload>): Observable<{ data: Address }> {
    return this.http.patch<{ data: Address }>(`${this.api}/addresses/${id}`, payload);
  }

  remove(id: string): Observable<{ data: { id: string } }> {
    return this.http.delete<{ data: { id: string } }>(`${this.api}/addresses/${id}`);
  }
}
