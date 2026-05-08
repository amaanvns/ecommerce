import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  authorName: string;
}

export interface ReviewListResponse {
  data: Review[];
  meta: { total: number; average: number };
}

export interface ReviewEligibility {
  purchased: boolean;
  existing: {
    id: string;
    rating: number;
    title: string | null;
    body: string | null;
    status: 'pending' | 'approved' | 'rejected';
  } | null;
  canReview: boolean;
}

export interface CreateReviewPayload {
  productId: string;
  rating: number;
  title?: string;
  body?: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(productId: string): Observable<ReviewListResponse> {
    return this.http.get<ReviewListResponse>(`${this.api}/reviews/product/${productId}`);
  }

  eligibility(productId: string): Observable<{ data: ReviewEligibility }> {
    return this.http.get<{ data: ReviewEligibility }>(
      `${this.api}/reviews/eligibility/${productId}`,
    );
  }

  create(payload: CreateReviewPayload): Observable<{ data: { id: string; status: string } }> {
    return this.http.post<{ data: { id: string; status: string } }>(`${this.api}/reviews`, payload);
  }

  delete(reviewId: string): Observable<{ data: { id: string } }> {
    return this.http.delete<{ data: { id: string } }>(`${this.api}/reviews/${reviewId}`);
  }
}
