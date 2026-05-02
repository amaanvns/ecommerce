import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { CheckoutService } from '../../core/services/checkout.service';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe],
  template: `
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 class="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      @if (cart.items().length === 0) {
        <div class="text-center py-20 text-gray-400">
          <p class="text-lg font-medium">Your cart is empty</p>
          <a
            routerLink="/products"
            class="mt-4 inline-block text-indigo-600 hover:underline text-sm"
          >
            Browse products
          </a>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <!-- Left: Address form -->
          <div class="lg:col-span-3">
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 class="text-base font-semibold text-gray-900 mb-5">Shipping Address</h2>

              <form [formGroup]="form" class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    formControlName="name"
                    type="text"
                    class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    [class.border-red-400]="invalid('name')"
                    placeholder="Amaan Arshad"
                  />
                  @if (invalid('name')) {
                    <p class="text-xs text-red-500 mt-1">Required</p>
                  }
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    formControlName="phone"
                    type="tel"
                    class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    [class.border-red-400]="invalid('phone')"
                    placeholder="+91 98765 43210"
                  />
                  @if (invalid('phone')) {
                    <p class="text-xs text-red-500 mt-1">Required</p>
                  }
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1"
                    >Address Line 1 *</label
                  >
                  <input
                    formControlName="line1"
                    type="text"
                    class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    [class.border-red-400]="invalid('line1')"
                    placeholder="House/Flat no., Street name"
                  />
                  @if (invalid('line1')) {
                    <p class="text-xs text-red-500 mt-1">Required</p>
                  }
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                  <input
                    formControlName="line2"
                    type="text"
                    class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Landmark, Colony (optional)"
                  />
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input
                      formControlName="city"
                      type="text"
                      class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      [class.border-red-400]="invalid('city')"
                      placeholder="Mumbai"
                    />
                    @if (invalid('city')) {
                      <p class="text-xs text-red-500 mt-1">Required</p>
                    }
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">State *</label>
                    <input
                      formControlName="state"
                      type="text"
                      class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      [class.border-red-400]="invalid('state')"
                      placeholder="Maharashtra"
                    />
                    @if (invalid('state')) {
                      <p class="text-xs text-red-500 mt-1">Required</p>
                    }
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">PIN Code *</label>
                    <input
                      formControlName="postalCode"
                      type="text"
                      class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      [class.border-red-400]="invalid('postalCode')"
                      placeholder="400001"
                    />
                    @if (invalid('postalCode')) {
                      <p class="text-xs text-red-500 mt-1">Required</p>
                    }
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      formControlName="country"
                      type="text"
                      class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 focus:outline-none"
                      readonly
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Order Notes</label>
                  <textarea
                    formControlName="notes"
                    rows="2"
                    class="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Any special instructions (optional)"
                  ></textarea>
                </div>
              </form>
            </div>
          </div>

          <!-- Right: Order summary -->
          <div class="lg:col-span-2">
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
              <h2 class="text-base font-semibold text-gray-900 mb-4">Order Summary</h2>

              <div class="space-y-3 mb-4">
                @for (item of cart.items(); track item.id) {
                  <div class="flex gap-3">
                    @if (item.image) {
                      <img
                        [src]="item.image.url"
                        [alt]="item.productName"
                        class="w-12 h-12 rounded-lg object-cover border border-gray-100 shrink-0"
                      />
                    }
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-gray-900 line-clamp-1">
                        {{ item.productName }}
                      </p>
                      @if (item.attributes && objectKeys(item.attributes).length > 0) {
                        <p class="text-xs text-gray-400">{{ formatAttrs(item.attributes) }}</p>
                      }
                      <p class="text-xs text-gray-500 mt-0.5">
                        {{ item.qty }} ×
                        {{ +item.priceSnapshot | currency: 'INR' : 'symbol' : '1.2-2' }}
                      </p>
                    </div>
                    <span class="text-sm font-semibold text-gray-900 shrink-0">
                      {{ item.qty * +item.priceSnapshot | currency: 'INR' : 'symbol' : '1.2-2' }}
                    </span>
                  </div>
                }
              </div>

              <div class="border-t border-gray-100 pt-4 space-y-2">
                <div class="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{{ cart.total() | currency: 'INR' : 'symbol' : '1.2-2' }}</span>
                </div>
                <div class="flex justify-between text-sm text-gray-500">
                  <span>Shipping</span>
                  <span class="text-green-600 font-medium">Free</span>
                </div>
                <div
                  class="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100"
                >
                  <span>Total</span>
                  <span>{{ cart.total() | currency: 'INR' : 'symbol' : '1.2-2' }}</span>
                </div>
              </div>

              @if (error()) {
                <div
                  class="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg"
                >
                  {{ error() }}
                </div>
              }

              <button
                (click)="pay()"
                [disabled]="processing()"
                class="mt-5 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                @if (processing()) {
                  <svg
                    class="animate-spin w-4 h-4"
                    width="16"
                    height="16"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      class="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      stroke-width="4"
                    ></circle>
                    <path
                      class="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    ></path>
                  </svg>
                  Processing…
                } @else {
                  Pay {{ cart.total() | currency: 'INR' : 'symbol' : '1.2-2' }}
                }
              </button>

              <p class="mt-3 text-center text-xs text-gray-400">
                Secured by Razorpay · UPI, Cards, Net Banking accepted
              </p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CheckoutComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly cart = inject(CartService);
  readonly auth = inject(AuthService);
  private readonly checkoutService = inject(CheckoutService);

  readonly processing = signal(false);
  readonly error = signal('');

  readonly objectKeys = Object.keys;

  readonly form = this.fb.group({
    name: ['', Validators.required],
    phone: ['', Validators.required],
    line1: ['', Validators.required],
    line2: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postalCode: ['', Validators.required],
    country: [{ value: 'IN', disabled: true }],
    notes: [''],
  });

  ngOnInit(): void {
    // Pre-fill name from auth user
    const user = this.auth.currentUser();
    if (user) this.form.patchValue({ name: user.name });
  }

  invalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }

  formatAttrs(attrs: Record<string, string>): string {
    return Object.entries(attrs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
  }

  pay(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.error.set('');
    this.processing.set(true);

    const v = this.form.getRawValue();
    const shippingAddress = {
      name: v.name!,
      phone: v.phone ?? undefined,
      line1: v.line1!,
      line2: v.line2 ?? undefined,
      city: v.city!,
      state: v.state!,
      postalCode: v.postalCode!,
      country: v.country ?? 'IN',
    };

    this.checkoutService.createOrder(shippingAddress, v.notes ?? undefined).subscribe({
      next: async (res) => {
        const { orderId, razorpayOrderId, amount, currency, keyId } = res.data;
        const user = this.auth.currentUser();

        try {
          await this.checkoutService.loadRazorpayScript();
        } catch {
          this.error.set('Failed to load payment gateway. Please try again.');
          this.processing.set(false);
          return;
        }

        this.checkoutService.openRazorpay({
          key: keyId,
          amount,
          currency,
          name: 'ShopZone',
          description: 'Order Payment',
          order_id: razorpayOrderId,
          prefill: { name: user?.name, email: user?.email },
          theme: { color: '#6366f1' },
          handler: (response) => {
            this.checkoutService
              .verifyPayment(
                orderId,
                response.razorpay_order_id,
                response.razorpay_payment_id,
                response.razorpay_signature,
              )
              .subscribe({
                next: (verifyRes) => {
                  this.cart.load();
                  this.router.navigate(['/orders', verifyRes.data.orderId], {
                    queryParams: { success: '1' },
                  });
                },
                error: () => {
                  this.error.set(
                    'Payment verification failed. Contact support if amount was deducted.',
                  );
                  this.processing.set(false);
                },
              });
          },
          modal: {
            ondismiss: () => this.processing.set(false),
          },
        });
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? 'Failed to create order. Please try again.');
        this.processing.set(false);
      },
    });
  }
}
