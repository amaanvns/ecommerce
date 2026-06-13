import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import { CartService } from '../../core/services/cart.service';
import { AuthService } from '../../core/services/auth.service';
import { CheckoutService } from '../../core/services/checkout.service';
import {
  AvailableCoupon,
  CouponPreview,
  CouponsService,
} from '../../core/services/coupons.service';
import { Address, AddressesService } from '../../core/services/addresses.service';

@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink, CurrencyPipe],
  template: `
    <section class="container-edge pt-20 pb-12 lg:pt-28 lg:pb-16">
      <h1 class="text-4xl md:text-5xl font-light tracking-tighter">Checkout</h1>
    </section>

    <div class="container-edge pb-24">
      @if (cart.items().length === 0) {
        <div class="text-center py-32">
          <p class="text-3xl font-light tracking-tight mb-3">Your bag is empty</p>
          <p class="text-ink-500 mb-8">Find something you'll love first.</p>
          <a routerLink="/products" class="btn-outline">Continue Shopping</a>
        </div>
      } @else {
        <div class="grid lg:grid-cols-12 gap-12 lg:gap-16">
          <!-- Form -->
          <div class="lg:col-span-7">
            <h2 class="text-2xl font-light tracking-tight mb-10">Shipping address</h2>

            @if (auth.isAuthenticated() && savedAddresses().length > 0) {
              <div class="mb-8 space-y-3">
                <p class="label-input mb-1">Saved addresses</p>
                @for (a of savedAddresses(); track a.id) {
                  <button
                    type="button"
                    (click)="selectAddress(a)"
                    class="w-full text-left border rounded-lg p-4 transition-colors"
                    [class.border-ink]="selectedAddressId() === a.id"
                    [class.border-ink-200]="selectedAddressId() !== a.id"
                  >
                    <p class="text-sm text-ink flex items-center gap-2">
                      <span class="font-medium">{{ a.name }}</span>
                      @if (a.isDefault) {
                        <span class="text-2xs uppercase tracking-widest text-ink-400">Default</span>
                      }
                    </p>
                    <p class="text-sm text-ink-500 mt-0.5">
                      {{ a.line1 }}, {{ a.city }}, {{ a.state }} {{ a.postalCode }}
                    </p>
                  </button>
                }
                <button
                  type="button"
                  (click)="useNewAddress()"
                  class="w-full text-left border rounded-lg p-4 transition-colors"
                  [class.border-ink]="selectedAddressId() === null"
                  [class.border-ink-200]="selectedAddressId() !== null"
                >
                  <p class="text-sm">+ Use a new address</p>
                </button>
              </div>
            }

            <form [formGroup]="form" class="space-y-7">
              @if (!auth.isAuthenticated()) {
                <div>
                  <label class="label-input">Email</label>
                  <input
                    formControlName="email"
                    type="email"
                    class="input-clean"
                    [class.border-ink]="invalid('email')"
                    placeholder="you@example.com"
                  />
                  @if (invalid('email')) {
                    <p class="mt-1 text-xs text-ink">Enter a valid email</p>
                  } @else {
                    <p class="mt-1 text-xs text-ink-400">
                      We'll send your order confirmation here.
                      <a routerLink="/auth/login" class="link-underline text-ink-500"
                        >Have an account?</a
                      >
                    </p>
                  }
                </div>
              }
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label class="label-input">Full Name</label>
                  <input
                    formControlName="name"
                    type="text"
                    class="input-clean"
                    [class.border-ink]="invalid('name')"
                    placeholder="Jane Smith"
                  />
                  @if (invalid('name')) {
                    <p class="mt-1 text-xs text-ink">Required</p>
                  }
                </div>
                <div>
                  <label class="label-input">Phone</label>
                  <input
                    formControlName="phone"
                    type="tel"
                    class="input-clean"
                    [class.border-ink]="invalid('phone')"
                    placeholder="+91 98765 43210"
                  />
                  @if (invalid('phone')) {
                    <p class="mt-1 text-xs text-ink">Required</p>
                  }
                </div>
              </div>

              <div>
                <label class="label-input">Address Line 1</label>
                <input
                  formControlName="line1"
                  type="text"
                  class="input-clean"
                  [class.border-ink]="invalid('line1')"
                  placeholder="House / flat number, street name"
                />
                @if (invalid('line1')) {
                  <p class="mt-1 text-xs text-ink">Required</p>
                }
              </div>

              <div>
                <label class="label-input"
                  >Address Line 2
                  <span class="text-ink-300 normal-case tracking-normal">(optional)</span></label
                >
                <input
                  formControlName="line2"
                  type="text"
                  class="input-clean"
                  placeholder="Landmark, colony"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label class="label-input">City</label>
                  <input
                    formControlName="city"
                    type="text"
                    class="input-clean"
                    [class.border-ink]="invalid('city')"
                    placeholder="Mumbai"
                  />
                  @if (invalid('city')) {
                    <p class="mt-1 text-xs text-ink">Required</p>
                  }
                </div>
                <div>
                  <label class="label-input">State</label>
                  <input
                    formControlName="state"
                    type="text"
                    class="input-clean"
                    [class.border-ink]="invalid('state')"
                    placeholder="Maharashtra"
                  />
                  @if (invalid('state')) {
                    <p class="mt-1 text-xs text-ink">Required</p>
                  }
                </div>
                <div>
                  <label class="label-input">PIN Code</label>
                  <input
                    formControlName="postalCode"
                    type="text"
                    class="input-clean tabular"
                    [class.border-ink]="invalid('postalCode')"
                    placeholder="400001"
                  />
                  @if (invalid('postalCode')) {
                    <p class="mt-1 text-xs text-ink">Required</p>
                  }
                </div>
              </div>

              <div>
                <label class="label-input"
                  >Order Notes
                  <span class="text-ink-300 normal-case tracking-normal">(optional)</span></label
                >
                <textarea
                  formControlName="notes"
                  rows="3"
                  class="input-clean resize-none"
                  placeholder="Special instructions for our team"
                ></textarea>
              </div>

              @if (auth.isAuthenticated() && selectedAddressId() === null) {
                <label class="flex items-center gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    [checked]="saveAddress()"
                    (change)="saveAddress.set($any($event.target).checked)"
                    class="accent-ink"
                  />
                  Save this address to my account
                </label>
              }
            </form>
          </div>

          <!-- Summary -->
          <div class="lg:col-span-5">
            <div class="lg:sticky lg:top-28 bg-ink-50 p-8 rounded-lg">
              <h2 class="text-2xl font-light tracking-tight mb-6">Your order</h2>

              <div class="space-y-5 pb-6 border-b border-ink-200">
                @for (item of cart.items(); track item.id) {
                  <div class="flex gap-4">
                    @if (item.image) {
                      <img
                        [src]="item.image.url"
                        [alt]="item.productName"
                        class="w-16 h-20 object-cover bg-ink-100 shrink-0"
                      />
                    }
                    <div class="flex-1 min-w-0">
                      <p class="text-base leading-snug line-clamp-2">{{ item.productName }}</p>
                      @if (item.attributes && objectKeys(item.attributes).length > 0) {
                        <p class="text-sm text-ink-500 mt-1">{{ formatAttrs(item.attributes) }}</p>
                      }
                      <p class="text-sm text-ink-400 mt-1 tabular">Qty {{ item.qty }}</p>
                    </div>
                    <span class="text-sm tabular shrink-0">
                      {{ item.qty * +item.priceSnapshot | currency: 'INR' : 'symbol' : '1.2-2' }}
                    </span>
                  </div>
                }
              </div>

              <!-- Coupon -->
              <div class="py-6 border-b border-ink-200">
                @if (!coupon()) {
                  <button
                    type="button"
                    (click)="showCouponInput.set(!showCouponInput())"
                    class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
                  >
                    {{ showCouponInput() ? 'Hide coupon' : 'Have a coupon code?' }}
                  </button>

                  @if (offers().length > 0) {
                    <div class="mt-4 space-y-2">
                      <p class="text-2xs uppercase tracking-widest text-ink-400">
                        Available offers
                      </p>
                      @for (o of offers(); track o.code) {
                        <button
                          type="button"
                          (click)="applyOffer(o.code)"
                          [disabled]="applyingCoupon()"
                          class="w-full flex items-center justify-between gap-3 border border-dashed border-ink-300 rounded px-3 py-2 text-left hover:border-ink transition-colors"
                        >
                          <span class="text-sm">
                            <span class="font-medium tracking-wider">{{ o.code }}</span>
                            <span class="text-ink-500 ml-2">{{ offerLabel(o) }}</span>
                          </span>
                          <span class="text-xs text-ink-400 shrink-0">Apply</span>
                        </button>
                      }
                    </div>
                  }

                  @if (showCouponInput()) {
                    <div class="mt-3 flex gap-3">
                      <input
                        type="text"
                        [value]="couponCode()"
                        (input)="couponCode.set($any($event.target).value)"
                        (keydown.enter)="$event.preventDefault(); applyCoupon()"
                        placeholder="Enter code"
                        class="input-clean text-sm uppercase tracking-wider"
                      />
                      <button
                        type="button"
                        (click)="applyCoupon()"
                        [disabled]="!couponCode().trim() || applyingCoupon()"
                        class="text-sm text-ink hover:text-ink-500 transition-colors link-underline shrink-0 self-end pb-3"
                      >
                        {{ applyingCoupon() ? 'Checking…' : 'Apply' }}
                      </button>
                    </div>
                    @if (couponError()) {
                      <p class="text-sm text-ink-500 mt-2">{{ couponError() }}</p>
                    }
                  }
                } @else {
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm text-ink">
                        {{ coupon()!.code }}
                        <span class="text-ink-500 ml-2">
                          @if (coupon()!.type === 'percent') {
                            ({{ coupon()!.value }}% off)
                          } @else {
                            (₹{{ coupon()!.value }} off)
                          }
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      (click)="removeCoupon()"
                      class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
                    >
                      Remove
                    </button>
                  </div>
                }
              </div>

              <div class="py-6 space-y-3 border-b border-ink-200">
                <div class="flex justify-between text-sm">
                  <span class="text-ink-500">Subtotal</span>
                  <span class="tabular">{{
                    cart.total() | currency: 'INR' : 'symbol' : '1.2-2'
                  }}</span>
                </div>
                @if (coupon()) {
                  <div class="flex justify-between text-sm">
                    <span class="text-ink-500">Discount</span>
                    <span class="tabular text-ink">
                      −{{ coupon()!.discount | currency: 'INR' : 'symbol' : '1.2-2' }}
                    </span>
                  </div>
                }
                <div class="flex justify-between text-sm">
                  <span class="text-ink-500">Shipping</span>
                  <span class="text-ink-500">Free</span>
                </div>
              </div>

              <div class="flex justify-between items-baseline pt-6 mb-6">
                <span class="text-sm">Total</span>
                <span class="text-2xl font-light tabular">
                  {{ totalAfterDiscount() | currency: 'INR' : 'symbol' : '1.2-2' }}
                </span>
              </div>

              <!-- Payment method -->
              <div class="pb-6 space-y-3">
                <p class="label-input mb-1">Payment method</p>
                <label
                  class="flex items-center gap-3 cursor-pointer border px-4 py-3 rounded transition-colors"
                  [class.border-ink]="paymentMethod() === 'online'"
                  [class.border-ink-200]="paymentMethod() !== 'online'"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    [checked]="paymentMethod() === 'online'"
                    (change)="paymentMethod.set('online')"
                    class="accent-ink"
                  />
                  <span class="text-sm"
                    >Pay online <span class="text-ink-400">(card / UPI)</span></span
                  >
                </label>

                @if (codEligible()) {
                  <label
                    class="flex items-center gap-3 cursor-pointer border px-4 py-3 rounded transition-colors"
                    [class.border-ink]="paymentMethod() === 'cod'"
                    [class.border-ink-200]="paymentMethod() !== 'cod'"
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      [checked]="paymentMethod() === 'cod'"
                      (change)="paymentMethod.set('cod')"
                      class="accent-ink"
                    />
                    <span class="text-sm">Cash on Delivery</span>
                  </label>
                } @else {
                  <p class="text-xs text-ink-400">
                    Some items in your bag aren't eligible for Cash on Delivery, so only online
                    payment is available.
                  </p>
                }
              </div>

              @if (error()) {
                <div class="mb-4 bg-ink-100 px-4 py-3 text-sm text-ink rounded">
                  {{ error() }}
                </div>
              }

              <button (click)="pay()" [disabled]="processing()" class="btn-primary w-full">
                @if (processing()) {
                  Processing…
                } @else if (paymentMethod() === 'cod') {
                  Place order
                } @else {
                  Pay securely
                }
              </button>

              @if (paymentMethod() === 'online') {
                <p class="mt-4 text-sm text-ink-400 text-center">Secured by Razorpay</p>
              } @else {
                <p class="mt-4 text-sm text-ink-400 text-center">
                  Pay in cash when your order arrives
                </p>
              }
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
  private readonly couponsService = inject(CouponsService);
  private readonly addressesService = inject(AddressesService);

  readonly processing = signal(false);
  readonly error = signal('');

  // Saved addresses (logged-in users)
  readonly savedAddresses = signal<Address[]>([]);
  readonly selectedAddressId = signal<string | null>(null);
  readonly saveAddress = signal(true);
  private static readonly GUEST_ADDRESS_KEY = 'guestAddress';

  // Payment method — COD only offered when every item in the bag allows it
  readonly paymentMethod = signal<'online' | 'cod'>('online');
  readonly codEligible = computed(
    () => this.cart.items().length > 0 && this.cart.items().every((i) => i.codAvailable),
  );

  // If the bag changes (e.g. a non-COD item added from the drawer) while COD is
  // selected, fall back to online so the selection can't go stale
  private readonly codGuard = effect(() => {
    if (!this.codEligible() && this.paymentMethod() === 'cod') {
      this.paymentMethod.set('online');
    }
  });

  // Keep the guest email requirement in sync with auth state (it can change
  // mid-checkout, e.g. logging in from another tab)
  private readonly emailValidatorGuard = effect(() => {
    const emailCtrl = this.form.get('email');
    if (!emailCtrl) return;
    if (this.auth.isAuthenticated()) {
      emailCtrl.clearValidators();
    } else {
      emailCtrl.setValidators([Validators.required, Validators.email]);
    }
    emailCtrl.updateValueAndValidity({ emitEvent: false });
  });

  // Coupon state
  readonly showCouponInput = signal(false);
  readonly couponCode = signal('');
  readonly applyingCoupon = signal(false);
  readonly couponError = signal('');
  readonly coupon = signal<CouponPreview | null>(null);
  readonly offers = signal<AvailableCoupon[]>([]);

  readonly totalAfterDiscount = computed(() => {
    const subtotal = this.cart.total();
    const discount = this.coupon()?.discount ?? 0;
    return Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  });

  readonly objectKeys = Object.keys;

  readonly form = this.fb.group({
    email: [''],
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
    const user = this.auth.currentUser();
    if (user) {
      this.form.patchValue({ name: user.name });
      // Load the saved address book; preselect the default
      this.addressesService.list().subscribe({
        next: (res) => {
          this.savedAddresses.set(res.data);
          const def = res.data.find((a) => a.isDefault) ?? res.data[0];
          if (def) this.selectAddress(def);
        },
      });
    } else {
      this.prefillGuestAddress();
    }

    // Show currently-available offers as one-tap chips
    this.couponsService.available().subscribe({ next: (res) => this.offers.set(res.data) });
  }

  offerLabel(o: AvailableCoupon): string {
    const off = o.type === 'percent' ? `${+o.value}% off` : `₹${+o.value} off`;
    const min = o.minSubtotal ? ` over ₹${+o.minSubtotal}` : '';
    return off + min;
  }

  applyOffer(code: string): void {
    this.couponCode.set(code);
    this.showCouponInput.set(true);
    this.applyCoupon();
  }

  /** Fill the form from a saved address and mark it selected. */
  selectAddress(a: Address): void {
    this.selectedAddressId.set(a.id);
    this.form.patchValue({
      name: a.name,
      phone: a.phone ?? '',
      line1: a.line1,
      line2: a.line2 ?? '',
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
    });
  }

  /** Switch to entering a fresh address (clears the shipping fields). */
  useNewAddress(): void {
    this.selectedAddressId.set(null);
    this.saveAddress.set(true);
    this.form.patchValue({
      name: this.auth.currentUser()?.name ?? '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
    });
  }

  private prefillGuestAddress(): void {
    try {
      const raw = localStorage.getItem(CheckoutComponent.GUEST_ADDRESS_KEY);
      if (raw) this.form.patchValue(JSON.parse(raw));
    } catch {
      // localStorage unavailable / bad JSON — ignore
    }
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

  applyCoupon(): void {
    const code = this.couponCode().trim();
    if (!code) return;
    this.couponError.set('');
    this.applyingCoupon.set(true);
    this.couponsService.validate(code, this.cart.total()).subscribe({
      next: (res) => {
        this.coupon.set(res.data);
        this.applyingCoupon.set(false);
      },
      error: (err) => {
        this.applyingCoupon.set(false);
        this.couponError.set(err?.error?.error ?? 'Could not apply coupon.');
      },
    });
  }

  removeCoupon(): void {
    this.coupon.set(null);
    this.couponCode.set('');
    this.couponError.set('');
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
    const contactEmail = this.auth.currentUser()?.email ?? v.email ?? undefined;

    if (this.paymentMethod() === 'cod') {
      this.checkoutService
        .placeCodOrder(shippingAddress, v.notes ?? undefined, this.coupon()?.code, contactEmail)
        .subscribe({
          next: (res) => {
            this.persistAddress(shippingAddress);
            this.cart.load();
            this.afterOrder(res.data.orderId, contactEmail);
          },
          error: (err) => {
            this.error.set(err?.error?.error ?? 'Failed to place order. Please try again.');
            this.processing.set(false);
          },
        });
      return;
    }

    this.checkoutService
      .createOrder(shippingAddress, v.notes ?? undefined, this.coupon()?.code, contactEmail)
      .subscribe({
        next: async (res) => {
          this.persistAddress(shippingAddress);
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
            name: 'Star Enterprises',
            description: 'Order Payment',
            order_id: razorpayOrderId,
            prefill: { name: user?.name, email: user?.email },
            theme: { color: '#0A0A0A' },
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
                    this.afterOrder(verifyRes.data.orderId, contactEmail);
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

  /**
   * Save the entered address for reuse: logged-in users get it added to their
   * address book (when it's a new one they opted to save); guests get it stashed
   * in localStorage so it prefills next time. Side-effect only — never blocks checkout.
   */
  private persistAddress(addr: {
    name: string;
    phone?: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }): void {
    if (this.auth.isAuthenticated()) {
      // Skip when an existing saved address was picked, when the user opted out,
      // or when an equivalent address is already in the book (repeat checkouts
      // would otherwise pile up duplicates)
      const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();
      const duplicate = this.savedAddresses().some(
        (a) =>
          norm(a.name) === norm(addr.name) &&
          norm(a.line1) === norm(addr.line1) &&
          norm(a.postalCode) === norm(addr.postalCode),
      );
      if (!this.selectedAddressId() && this.saveAddress() && !duplicate) {
        this.addressesService
          .create({ ...addr, isDefault: this.savedAddresses().length === 0 })
          .subscribe({ next: () => {}, error: () => {} });
      }
    } else {
      try {
        localStorage.setItem(CheckoutComponent.GUEST_ADDRESS_KEY, JSON.stringify(addr));
      } catch {
        // ignore storage errors
      }
    }
  }

  /** Route to the right post-order page: logged-in → my orders; guest → confirmation. */
  private afterOrder(orderId: string, email?: string): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/orders', orderId], { queryParams: { success: '1' } });
    } else {
      this.router.navigate(['/order-confirmation', orderId], { state: { email } });
    }
  }
}
