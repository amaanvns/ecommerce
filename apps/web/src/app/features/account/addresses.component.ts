import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Address, AddressesService } from '../../core/services/addresses.service';

@Component({
  selector: 'app-addresses',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="container-edge pt-20 pb-12 lg:pt-28 lg:pb-10 max-w-3xl">
      <a routerLink="/account" class="text-sm text-ink-500 hover:text-ink link-underline"
        >← Account</a
      >
      <h1 class="mt-4 text-4xl md:text-5xl font-light tracking-tighter">Addresses</h1>
      <p class="mt-3 text-ink-500">Saved addresses speed up checkout.</p>
    </section>

    <div class="container-edge pb-24 max-w-3xl">
      @if (loading()) {
        <div class="space-y-3">
          @for (_ of [1, 2]; track $index) {
            <div class="h-28 bg-ink-50 animate-pulse rounded-lg"></div>
          }
        </div>
      } @else {
        <!-- List -->
        <div class="space-y-3 mb-10">
          @for (a of addresses(); track a.id) {
            <div class="border border-ink-200 rounded-lg p-5 flex justify-between gap-4">
              <div class="text-sm leading-relaxed">
                <p class="text-ink flex items-center gap-2">
                  <span class="font-medium">{{ a.name }}</span>
                  @if (a.isDefault) {
                    <span class="text-2xs uppercase tracking-widest bg-ink text-paper px-2 py-0.5"
                      >Default</span
                    >
                  }
                </p>
                <p class="text-ink-500">
                  {{ a.line1 }}
                  @if (a.line2) {
                    , {{ a.line2 }}
                  }
                  <br />
                  {{ a.city }}, {{ a.state }} {{ a.postalCode }}, {{ a.country }}
                  @if (a.phone) {
                    <br />{{ a.phone }}
                  }
                </p>
              </div>
              <div class="flex flex-col items-end gap-2 shrink-0 text-sm">
                <button (click)="edit(a)" class="text-ink-500 hover:text-ink link-underline">
                  Edit
                </button>
                @if (!a.isDefault) {
                  <button
                    (click)="setDefault(a)"
                    class="text-ink-500 hover:text-ink link-underline"
                  >
                    Set default
                  </button>
                }
                <button (click)="remove(a)" class="text-ink-400 hover:text-ink link-underline">
                  Delete
                </button>
              </div>
            </div>
          }
          @if (addresses().length === 0) {
            <p class="text-ink-500 py-8 text-center">No saved addresses yet.</p>
          }
        </div>

        <!-- Add / edit form -->
        <div class="border-t border-ink-200 pt-8">
          <h2 class="text-2xl font-light tracking-tight mb-6">
            {{ editingId() ? 'Edit address' : 'Add an address' }}
          </h2>

          <form [formGroup]="form" (ngSubmit)="save()" class="space-y-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label class="label-input">Full Name</label>
                <input
                  formControlName="name"
                  type="text"
                  class="input-clean"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label class="label-input">Phone</label>
                <input formControlName="phone" type="tel" class="input-clean" placeholder="+91 …" />
              </div>
            </div>
            <div>
              <label class="label-input">Address Line 1</label>
              <input formControlName="line1" type="text" class="input-clean" />
            </div>
            <div>
              <label class="label-input"
                >Address Line 2 <span class="text-ink-300 normal-case">(optional)</span></label
              >
              <input formControlName="line2" type="text" class="input-clean" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label class="label-input">City</label>
                <input formControlName="city" type="text" class="input-clean" />
              </div>
              <div>
                <label class="label-input">State</label>
                <input formControlName="state" type="text" class="input-clean" />
              </div>
              <div>
                <label class="label-input">PIN Code</label>
                <input formControlName="postalCode" type="text" class="input-clean tabular" />
              </div>
            </div>
            <label class="flex items-center gap-3 text-sm cursor-pointer">
              <input type="checkbox" formControlName="isDefault" class="accent-ink" />
              Set as default address
            </label>

            @if (error()) {
              <p class="text-sm text-ink">{{ error() }}</p>
            }

            <div class="flex items-center gap-4">
              <button type="submit" [disabled]="form.invalid || saving()" class="btn-primary">
                {{ saving() ? 'Saving…' : editingId() ? 'Save changes' : 'Add address' }}
              </button>
              @if (editingId()) {
                <button
                  type="button"
                  (click)="resetForm()"
                  class="text-sm text-ink-500 hover:text-ink link-underline"
                >
                  Cancel
                </button>
              }
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class AddressesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly addressesService = inject(AddressesService);

  readonly addresses = signal<Address[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    phone: [''],
    line1: ['', Validators.required],
    line2: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postalCode: ['', Validators.required],
    isDefault: [false],
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.addressesService.list().subscribe({
      next: (res) => {
        this.addresses.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  edit(a: Address): void {
    this.editingId.set(a.id);
    this.form.patchValue({
      name: a.name,
      phone: a.phone ?? '',
      line1: a.line1,
      line2: a.line2 ?? '',
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      isDefault: a.isDefault,
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  }

  resetForm(): void {
    this.editingId.set(null);
    this.error.set('');
    this.form.reset({ isDefault: false });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const v = this.form.getRawValue();
    const payload = {
      name: v.name!,
      phone: v.phone || undefined,
      line1: v.line1!,
      line2: v.line2 || undefined,
      city: v.city!,
      state: v.state!,
      postalCode: v.postalCode!,
      country: 'IN',
      isDefault: !!v.isDefault,
    };

    const id = this.editingId();
    const req$ = id
      ? this.addressesService.update(id, payload)
      : this.addressesService.create(payload);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.resetForm();
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not save address. Please check the fields and try again.');
      },
    });
  }

  setDefault(a: Address): void {
    this.addressesService.update(a.id, { isDefault: true }).subscribe({ next: () => this.load() });
  }

  remove(a: Address): void {
    this.addressesService.remove(a.id).subscribe({ next: () => this.load() });
  }
}
