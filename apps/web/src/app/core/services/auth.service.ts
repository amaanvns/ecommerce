import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenService } from './token.service';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin' | 'super_admin';
}

interface AuthResponse {
  success: boolean;
  data: { user: AuthUser; accessToken: string; refreshToken: string };
}

interface RefreshResponse {
  success: boolean;
  data: { accessToken: string; refreshToken: string };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  private readonly api = environment.apiUrl;

  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly isAdmin = computed(() => {
    const role = this.currentUser()?.role;
    return role === 'admin' || role === 'super_admin';
  });

  initialize(): void {
    const token = this.tokenService.getAccessToken();
    if (!token || this.tokenService.isTokenExpired(token)) {
      this.currentUser.set(null);
      return;
    }
    const payload = this.tokenService.decodePayload(token);
    if (payload) {
      this.currentUser.set({
        id: payload['sub'] as string,
        email: payload['email'] as string,
        name: (payload['name'] as string) ?? '',
        role: payload['role'] as AuthUser['role'],
      });
    }
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.api}/auth/login`, { email, password })
      .pipe(tap((res) => this.handleAuthSuccess(res)));
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.api}/auth/register`, { name, email, password })
      .pipe(tap((res) => this.handleAuthSuccess(res)));
  }

  logout(): void {
    const refreshToken = this.tokenService.getRefreshToken();
    if (refreshToken) {
      this.http
        .post(`${this.api}/auth/logout`, { refreshToken })
        .pipe(catchError(() => of(null)))
        .subscribe();
    }
    this.tokenService.clearTokens();
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  refreshTokens(): Observable<RefreshResponse> {
    const refreshToken = this.tokenService.getRefreshToken();
    return this.http.post<RefreshResponse>(`${this.api}/auth/refresh`, { refreshToken }).pipe(
      tap((res) => {
        this.tokenService.setTokens(res.data.accessToken, res.data.refreshToken);
      }),
    );
  }

  private handleAuthSuccess(res: AuthResponse): void {
    this.tokenService.setTokens(res.data.accessToken, res.data.refreshToken);
    this.currentUser.set(res.data.user);
  }
}
