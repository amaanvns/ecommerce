import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { TokenService } from '../services/token.service';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshed$ = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Auth endpoints handle their own tokens — skip
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  const token = tokenService.getAccessToken();
  const authedReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authedReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);

      if (!isRefreshing) {
        isRefreshing = true;
        refreshed$.next(null);

        return authService.refreshTokens().pipe(
          switchMap((res) => {
            isRefreshing = false;
            refreshed$.next(res.data.accessToken);
            const retried = req.clone({
              setHeaders: { Authorization: `Bearer ${res.data.accessToken}` },
            });
            return next(retried);
          }),
          catchError((refreshErr) => {
            isRefreshing = false;
            tokenService.clearTokens();
            authService.currentUser.set(null);
            router.navigate(['/auth/login']);
            return throwError(() => refreshErr);
          }),
        );
      }

      // Another request already triggered refresh — wait for the new token
      return refreshed$.pipe(
        filter((t): t is string => t !== null),
        take(1),
        switchMap((newToken) =>
          next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })),
        ),
      );
    }),
  );
};
