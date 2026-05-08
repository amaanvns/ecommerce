import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminCoupon, AdminService, PaginatedMeta } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-coupons',
  imports: [CurrencyPipe, DatePipe, TitleCasePipe, ReactiveFormsModule],
  template: `
    <section class="border-b border-ink-200 bg-paper">
      <div class="px-10 py-12 flex items-end justify-between gap-6">
        <div>
          <h1 class="text-4xl font-light tracking-tighter">Coupons</h1>
          @if (meta()) {
            <p class="text-sm text-ink-500 mt-2 tabular">
              {{ meta()!.total }} {{ meta()!.total === 1 ? 'coupon' : 'coupons' }}
            </p>
          }
        </div>
        <button (click)="openCreate()" class="btn-primary">+ New Coupon</button>
      </div>
    </section>

    <div class="px-10 py-10">
      @if (loading()) {
        <div class="space-y-px">
          @for (_ of [1, 2, 3, 4, 5]; track $index) {
            <div class="h-16 bg-ink-50 animate-pulse rounded"></div>
          }
        </div>
      }

      @if (!loading() && coupons().length === 0) {
        <p class="py-16 text-center text-3xl font-light tracking-tight">No coupons yet</p>
      }

      @if (!loading() && coupons().length > 0) {
        <table class="w-full">
          <thead>
            <tr class="border-b border-ink text-left text-sm">
              <th class="pb-3 label">Code</th>
              <th class="pb-3 label">Type</th>
              <th class="pb-3 label text-right">Value</th>
              <th class="pb-3 label text-right">Usage</th>
              <th class="pb-3 label">Window</th>
              <th class="pb-3 label">Status</th>
              <th class="pb-3 label text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (c of coupons(); track c.id) {
              <tr class="border-b border-ink-200 hover:bg-ink-50/60 transition-colors">
                <td class="py-4">
                  <p class="font-mono text-sm uppercase">{{ c.code }}</p>
                  @if (c.firstOrderOnly) {
                    <p class="text-2xs text-ink-400 mt-0.5">First order only</p>
                  }
                </td>
                <td class="py-4 text-sm">{{ c.type | titlecase }}</td>
                <td class="py-4 text-sm text-right tabular">
                  @if (c.type === 'percent') {
                    {{ +c.value }}%
                  } @else {
                    {{ +c.value | currency: 'INR' : 'symbol' : '1.0-0' }}
                  }
                  @if (c.minSubtotal) {
                    <p class="text-2xs text-ink-400">
                      Min {{ +c.minSubtotal | currency: 'INR' : 'symbol' : '1.0-0' }}
                    </p>
                  }
                </td>
                <td class="py-4 text-sm text-right tabular">
                  {{ c.usedCount }}
                  @if (c.usageLimit) {
                    / {{ c.usageLimit }}
                  }
                </td>
                <td class="py-4 text-sm text-ink-500">
                  @if (c.startsAt || c.endsAt) {
                    <span class="text-2xs">
                      {{ c.startsAt ? (c.startsAt | date: 'dd MMM') : '—' }}
                      to
                      {{ c.endsAt ? (c.endsAt | date: 'dd MMM yy') : '—' }}
                    </span>
                  } @else {
                    <span class="text-ink-400">Always</span>
                  }
                </td>
                <td class="py-4 text-sm">
                  <span [class]="statusClass(c)">{{ statusLabel(c) }}</span>
                </td>
                <td class="py-4 text-right">
                  <div class="flex items-center justify-end gap-4">
                    <button
                      (click)="openEdit(c)"
                      class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
                    >
                      Edit
                    </button>
                    <button
                      (click)="deleteCoupon(c)"
                      [disabled]="deletingId() === c.id"
                      class="text-sm text-ink-400 hover:text-ink transition-colors link-underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (meta(); as m) {
          @if (m.totalPages > 1) {
            <div class="flex items-center justify-between mt-8 pt-6 border-t border-ink-200">
              <span class="text-sm text-ink-500 tabular"
                >{{ (m.page - 1) * m.limit + 1 }}–{{ min(m.page * m.limit, m.total) }} of
                {{ m.total }}</span
              >
              <div class="flex gap-6">
                <button
                  (click)="goToPage(m.page - 1)"
                  [disabled]="m.page === 1"
                  class="text-sm text-ink-500 hover:text-ink transition-colors disabled:opacity-30"
                >
                  ← Previous
                </button>
                <button
                  (click)="goToPage(m.page + 1)"
                  [disabled]="m.page === m.totalPages"
                  class="text-sm text-ink-500 hover:text-ink transition-colors disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            </div>
          }
        }
      }
    </div>

    <!-- Create / Edit dialog -->
    @if (formOpen()) {
      <div
        class="fixed inset-0 bg-ink/50 z-40 backdrop-blur-sm animate-fade-in"
        (click)="closeForm()"
      ></div>
      <aside
        class="fixed right-0 top-0 h-full w-full max-w-lg bg-paper z-50 flex flex-col animate-fade-in overflow-y-auto"
      >
        <div class="flex items-center justify-between px-8 py-6 border-b border-ink-200">
          <h2 class="text-2xl font-light tracking-tight">
            {{ editing() ? 'Edit coupon' : 'New coupon' }}
          </h2>
          <button
            (click)="closeForm()"
            class="text-sm text-ink-500 hover:text-ink transition-colors"
          >
            Close
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="save()" class="flex-1 px-8 py-8 space-y-6">
          @if (formError()) {
            <p class="bg-ink-50 px-4 py-3 text-sm text-ink rounded">{{ formError() }}</p>
          }

          <div>
            <label class="label-input">Code</label>
            <input
              formControlName="code"
              placeholder="WELCOME10"
              class="input-clean uppercase tracking-wider font-mono"
              [readonly]="editing()"
            />
            @if (form.controls.code.invalid && form.controls.code.touched) {
              <p class="mt-2 text-xs text-ink-500">
                2–50 chars · letters, numbers, dash, underscore
              </p>
            }
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="label-input">Type</label>
              <select formControlName="type" class="input-clean bg-transparent">
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed off</option>
              </select>
            </div>
            <div>
              <label class="label-input">
                Value{{ form.controls.type.value === 'percent' ? ' (%)' : ' (₹)' }}
              </label>
              <input
                formControlName="value"
                type="number"
                min="0"
                step="0.01"
                class="input-clean tabular"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="label-input">Min subtotal (₹)</label>
              <input
                formControlName="minSubtotal"
                type="number"
                min="0"
                step="0.01"
                class="input-clean tabular"
                placeholder="Optional"
              />
            </div>
            @if (form.controls.type.value === 'percent') {
              <div>
                <label class="label-input">Max discount (₹)</label>
                <input
                  formControlName="maxDiscount"
                  type="number"
                  min="0"
                  step="0.01"
                  class="input-clean tabular"
                  placeholder="Optional"
                />
              </div>
            }
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="label-input">Usage limit</label>
              <input
                formControlName="usageLimit"
                type="number"
                min="1"
                step="1"
                class="input-clean tabular"
                placeholder="Unlimited"
              />
            </div>
            <div class="flex items-center gap-3 pt-7">
              <input
                id="firstOrderOnly"
                formControlName="firstOrderOnly"
                type="checkbox"
                class="w-4 h-4 accent-ink"
              />
              <label for="firstOrderOnly" class="text-sm text-ink">First order only</label>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="label-input">Starts at</label>
              <input formControlName="startsAt" type="datetime-local" class="input-clean" />
            </div>
            <div>
              <label class="label-input">Ends at</label>
              <input formControlName="endsAt" type="datetime-local" class="input-clean" />
            </div>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <input
              id="isActive"
              formControlName="isActive"
              type="checkbox"
              class="w-4 h-4 accent-ink"
            />
            <label for="isActive" class="text-sm text-ink">Active</label>
          </div>

          <div class="flex items-center gap-4 pt-6">
            <button type="submit" [disabled]="saving() || form.invalid" class="btn-primary">
              {{ saving() ? 'Saving…' : editing() ? 'Save changes' : 'Create coupon' }}
            </button>
            <button
              type="button"
              (click)="closeForm()"
              class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
            >
              Cancel
            </button>
          </div>
        </form>
      </aside>
    }
  `,
})
export class AdminCouponsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  readonly coupons = signal<AdminCoupon[]>([]);
  readonly meta = signal<PaginatedMeta | null>(null);
  readonly loading = signal(true);
  readonly deletingId = signal<string | null>(null);

  readonly formOpen = signal(false);
  readonly editing = signal<AdminCoupon | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');

  currentPage = 1;

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    type: ['percent' as 'percent' | 'fixed', Validators.required],
    value: [0, [Validators.required, Validators.min(0.01)]],
    minSubtotal: [null as number | null],
    maxDiscount: [null as number | null],
    usageLimit: [null as number | null],
    firstOrderOnly: [false],
    startsAt: [''],
    endsAt: [''],
    isActive: [true],
  });

  ngOnInit(): void {
    this.load();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminService.getCoupons(this.currentPage, 20).subscribe({
      next: (res) => {
        this.coupons.set(res.data);
        this.meta.set(res.meta);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.formError.set('');
    this.form.reset({
      code: '',
      type: 'percent',
      value: 10,
      minSubtotal: null,
      maxDiscount: null,
      usageLimit: null,
      firstOrderOnly: false,
      startsAt: '',
      endsAt: '',
      isActive: true,
    });
    this.formOpen.set(true);
  }

  openEdit(c: AdminCoupon): void {
    this.editing.set(c);
    this.formError.set('');
    this.form.reset({
      code: c.code,
      type: c.type,
      value: Number(c.value),
      minSubtotal: c.minSubtotal != null ? Number(c.minSubtotal) : null,
      maxDiscount: c.maxDiscount != null ? Number(c.maxDiscount) : null,
      usageLimit: c.usageLimit,
      firstOrderOnly: c.firstOrderOnly,
      startsAt: c.startsAt ? c.startsAt.slice(0, 16) : '',
      endsAt: c.endsAt ? c.endsAt.slice(0, 16) : '',
      isActive: c.isActive,
    });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formError.set('');

    const v = this.form.getRawValue();
    const payload = {
      code: v.code!,
      type: v.type!,
      value: Number(v.value),
      minSubtotal:
        v.minSubtotal != null && v.minSubtotal !== ('' as unknown as number)
          ? Number(v.minSubtotal)
          : null,
      maxDiscount:
        v.maxDiscount != null && v.maxDiscount !== ('' as unknown as number)
          ? Number(v.maxDiscount)
          : null,
      usageLimit:
        v.usageLimit != null && v.usageLimit !== ('' as unknown as number)
          ? Number(v.usageLimit)
          : null,
      firstOrderOnly: !!v.firstOrderOnly,
      startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : null,
      endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null,
      isActive: !!v.isActive,
    };

    const req$ = this.editing()
      ? this.adminService.updateCoupon(this.editing()!.id, payload)
      : this.adminService.createCoupon(payload);

    req$.subscribe({
      next: (res) => {
        this.saving.set(false);
        if (this.editing()) {
          this.coupons.update((rows) => rows.map((r) => (r.id === res.data.id ? res.data : r)));
        } else {
          this.coupons.update((rows) => [res.data, ...rows]);
        }
        this.closeForm();
      },
      error: (err) => {
        this.saving.set(false);
        const flat = err?.error?.error;
        const msg =
          typeof flat === 'string'
            ? flat
            : (flat?.fieldErrors && Object.values(flat.fieldErrors).flat().join(' · ')) ||
              flat?.formErrors?.[0] ||
              'Could not save coupon.';
        this.formError.set(msg);
      },
    });
  }

  deleteCoupon(c: AdminCoupon): void {
    if (!confirm(`Delete coupon "${c.code}"? This cannot be undone.`)) return;
    this.deletingId.set(c.id);
    this.adminService.deleteCoupon(c.id).subscribe({
      next: () => {
        this.coupons.update((rows) => rows.filter((r) => r.id !== c.id));
        this.deletingId.set(null);
      },
      error: () => this.deletingId.set(null),
    });
  }

  statusLabel(c: AdminCoupon): string {
    if (!c.isActive) return 'Inactive';
    const now = Date.now();
    if (c.startsAt && now < new Date(c.startsAt).getTime()) return 'Scheduled';
    if (c.endsAt && now > new Date(c.endsAt).getTime()) return 'Expired';
    if (c.usageLimit != null && c.usedCount >= c.usageLimit) return 'Exhausted';
    return 'Active';
  }

  statusClass(c: AdminCoupon): string {
    const label = this.statusLabel(c);
    if (label === 'Active') return 'text-ink';
    if (label === 'Scheduled') return 'text-ink-500';
    return 'text-ink-400';
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
