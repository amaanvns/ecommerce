import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="w-full">
      <h1 class="text-4xl md:text-5xl font-light tracking-tight">Sign in</h1>
      <p class="mt-3 text-ink-500">Welcome back.</p>

      @if (error()) {
        <div
          class="mt-8 bg-ink-50 border border-ink-200 px-4 py-3 text-sm text-ink animate-fade-in"
        >
          {{ error() }}
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" class="mt-10 space-y-7">
        <div>
          <label class="label-input">Email</label>
          <input
            formControlName="email"
            type="email"
            placeholder="you@example.com"
            class="input-clean"
            [class.border-ink]="isInvalid('email')"
          />
          @if (isInvalid('email')) {
            <p class="mt-2 text-xs text-ink-500">Enter a valid email address</p>
          }
        </div>

        <div>
          <div class="flex items-baseline justify-between">
            <label class="label-input mb-3">Password</label>
            <a href="#" class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
              >Forgot?</a
            >
          </div>
          <div class="relative">
            <input
              formControlName="password"
              [type]="showPassword() ? 'text' : 'password'"
              placeholder="••••••••"
              class="input-clean pr-14"
              [class.border-ink]="isInvalid('password')"
            />
            <button
              type="button"
              (click)="togglePassword()"
              class="absolute right-0 top-1/2 -translate-y-1/2 text-sm text-ink-400 hover:text-ink transition-colors"
            >
              {{ showPassword() ? 'Hide' : 'Show' }}
            </button>
          </div>
          @if (isInvalid('password')) {
            <p class="mt-2 text-xs text-ink-500">Password is required</p>
          }
        </div>

        <button type="submit" [disabled]="loading()" class="btn-primary w-full">
          {{ loading() ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>

      <p class="mt-12 text-center text-sm text-ink-500">
        New here?
        <a routerLink="/auth/register" class="ml-1 text-ink link-underline">Create an account</a>
      </p>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  isInvalid(field: 'email' | 'password') {
    const c = this.form.get(field)!;
    return c.invalid && (c.dirty || c.touched);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Login failed. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
