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
    <div class="w-full">
      <h1 class="text-4xl md:text-5xl font-light tracking-tight">Create account</h1>
      <p class="mt-3 text-ink-500">Save items, track orders, receive early access.</p>

      @if (error()) {
        <div
          class="mt-8 bg-ink-50 border border-ink-200 px-4 py-3 text-sm text-ink animate-fade-in"
        >
          {{ error() }}
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" class="mt-10 space-y-6">
        <div>
          <label class="label-input">Full name</label>
          <input
            formControlName="name"
            type="text"
            placeholder="Jane Smith"
            class="input-clean"
            [class.border-ink]="isInvalid('name')"
          />
          @if (isInvalid('name')) {
            <p class="mt-2 text-xs text-ink-500">Must be at least 2 characters</p>
          }
        </div>

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
          <label class="label-input">Password</label>
          <input
            formControlName="password"
            type="password"
            placeholder="Minimum 8 characters"
            class="input-clean"
            [class.border-ink]="isInvalid('password')"
          />
          @if (isInvalid('password')) {
            <p class="mt-2 text-xs text-ink-500">Must be at least 8 characters</p>
          }
        </div>

        <div>
          <label class="label-input">Confirm password</label>
          <input
            formControlName="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            class="input-clean"
            [class.border-ink]="showMismatch()"
          />
          @if (showMismatch()) {
            <p class="mt-2 text-xs text-ink-500">Passwords do not match</p>
          }
        </div>

        <button type="submit" [disabled]="loading()" class="btn-primary w-full mt-2">
          {{ loading() ? 'Creating account…' : 'Create account' }}
        </button>
      </form>

      <p class="mt-6 text-xs text-ink-400 text-center leading-relaxed">
        By signing up you agree to our
        <a href="#" class="link-underline text-ink-500">Terms</a> and
        <a href="#" class="link-underline text-ink-500">Privacy Policy</a>.
      </p>

      <p class="mt-10 text-center text-sm text-ink-500">
        Already a member?
        <a routerLink="/auth/login" class="ml-1 text-ink link-underline">Sign in</a>
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
