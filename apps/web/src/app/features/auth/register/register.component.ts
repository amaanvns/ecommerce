import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
      <h1 class="text-2xl font-bold text-gray-900 mb-1">Create an account</h1>
      <p class="text-sm text-gray-500 mb-6">Join thousands of happy customers</p>

      @if (error()) {
        <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {{ error() }}
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            formControlName="name"
            type="text"
            placeholder="John Doe"
            class="w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            [class.border-red-400]="isInvalid('name')"
            [class.border-gray-300]="!isInvalid('name')"
          />
          @if (isInvalid('name')) {
            <p class="mt-1 text-xs text-red-600">Name must be at least 2 characters</p>
          }
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            formControlName="email"
            type="email"
            placeholder="you@example.com"
            class="w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            [class.border-red-400]="isInvalid('email')"
            [class.border-gray-300]="!isInvalid('email')"
          />
          @if (isInvalid('email')) {
            <p class="mt-1 text-xs text-red-600">Enter a valid email address</p>
          }
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            formControlName="password"
            type="password"
            placeholder="Min. 8 characters"
            class="w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            [class.border-red-400]="isInvalid('password')"
            [class.border-gray-300]="!isInvalid('password')"
          />
          @if (isInvalid('password')) {
            <p class="mt-1 text-xs text-red-600">Password must be at least 8 characters</p>
          }
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <input
            formControlName="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            class="w-full px-3 py-2 border rounded-lg text-sm outline-none transition-colors
              focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            [class.border-red-400]="showMismatch()"
            [class.border-gray-300]="!showMismatch()"
          />
          @if (showMismatch()) {
            <p class="mt-1 text-xs text-red-600">Passwords do not match</p>
          }
        </div>

        <button
          type="submit"
          [disabled]="loading()"
          class="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-semibold
            hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          @if (loading()) {
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Creating account…
          } @else {
            Create Account
          }
        </button>
      </form>

      <p class="mt-4 text-center text-xs text-gray-400">
        By signing up you agree to our
        <a href="#" class="text-indigo-600 hover:underline">Terms</a> and
        <a href="#" class="text-indigo-600 hover:underline">Privacy Policy</a>.
      </p>

      <p class="mt-4 text-center text-sm text-gray-500">
        Already have an account?
        <a routerLink="/auth/login" class="text-indigo-600 font-medium hover:underline ml-1"
          >Sign in</a
        >
      </p>
    </div>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  readonly loading = signal(false);
  readonly error = signal('');

  isInvalid(field: 'name' | 'email' | 'password' | 'confirmPassword') {
    const c = this.form.get(field)!;
    return c.invalid && (c.dirty || c.touched);
  }

  showMismatch() {
    const c = this.form.get('confirmPassword')!;
    return (c.dirty || c.touched) && this.form.hasError('passwordsMismatch');
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');

    const { name, email, password } = this.form.getRawValue();
    this.auth.register(name, email, password).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Registration failed. Please try again.');
        this.loading.set(false);
      },
    });
  }
}
