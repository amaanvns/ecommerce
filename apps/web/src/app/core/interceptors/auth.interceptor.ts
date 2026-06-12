import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

/**
 * Single in-flight refresh shared by every 401 that arrives while it runs.
 * Success → all waiters retry with the new token. Failure → the error propagates
 * to every waiter (nobody hangs), the session is cleared once, and the user is
 * sent to login.
 */
let refreshInFlight: Observable<string> | null = null;

function refreshOnce(
  authService: AuthService,
  tokenService: TokenService,
  router: Router,
): Observable<string> {
  if (!refreshInFlight) {
    refreshInFlight = authService.refreshTokens().pipe(
      map((res) => res.data.accessToken),
      catchError((refreshErr) => {
        tokenService.clearTokens();
        authService.currentUser.set(null);
        router.navigate(['/auth/login']);
        return throwError(() => refreshErr);
      }),
      finalize(() => {
        refreshInFlight = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }
  return refreshInFlight;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Auth endpoints handle their own tokens — skip
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  // withCredentials lets the browser send/receive the guest-cart session cookie
  const token = tokenService.getAccessToken();
  const authedReq = req.clone({
    withCredentials: true,
    ...(token ? { setHeaders: { Authorization: `Bearer ${token}` } } : {}),
  });

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      // Only try to refresh when the request was actually authenticated —
      // a guest's 401 has no session to refresh
      if (err.status !== 401 || !token) return throwError(() => err);

      return refreshOnce(authService, tokenService, router).pipe(
        switchMap((newToken) =>
          next(
            req.clone({
              withCredentials: true,
              setHeaders: { Authorization: `Bearer ${newToken}` },
            }),
          ),
        ),
      );
    }),
  );
};
