import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { AdminService, ProductVariant, VariantPayload } from '../../../core/services/admin.service';
import { CatalogService, Category } from '../../../core/services/catalog.service';

interface VariantForm {
  sku: string;
  attributeKey: string;
  attributeVal: string;
  price: string;
  compareAtPrice: string;
  stockQty: number;
  lowStockThreshold: number;
}

const emptyVariantForm = (): VariantForm => ({
  sku: '',
  attributeKey: '',
  attributeVal: '',
  price: '',
  compareAtPrice: '',
  stockQty: 0,
  lowStockThreshold: 5,
});

function toVariantPayload(f: VariantForm): VariantPayload {
  const attributes: Record<string, string> = {};
  if (f.attributeKey.trim()) attributes[f.attributeKey.trim()] = f.attributeVal.trim();
  return {
    sku: f.sku.trim(),
    attributes,
    price: f.price,
    compareAtPrice: f.compareAtPrice || null,
    stockQty: Number(f.stockQty),
    lowStockThreshold: Number(f.lowStockThreshold),
  };
}

function variantToForm(v: ProductVariant): VariantForm {
  const keys = Object.keys(v.attributes ?? {});
  return {
    sku: v.sku,
    attributeKey: keys[0] ?? '',
    attributeVal: keys[0] ? (v.attributes[keys[0]] ?? '') : '',
    price: v.price,
    compareAtPrice: v.compareAtPrice ?? '',
    stockQty: v.stockQty,
    lowStockThreshold: v.lowStockThreshold,
  };
}

@Component({
  selector: 'app-admin-product-form',
  imports: [FormsModule, RouterLink, CurrencyPipe],
  template: `
    <div class="p-8 max-w-3xl">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-8">
        <a routerLink="/admin/products" class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
        </a>
        <h1 class="text-2xl font-bold text-gray-900">
          {{ isEditMode() ? 'Edit Product' : 'New Product' }}
        </h1>
      </div>

      @if (pageLoading()) {
        <div class="space-y-4">
          <div class="h-10 bg-gray-100 rounded-xl animate-pulse"></div>
          <div class="h-10 bg-gray-100 rounded-xl animate-pulse"></div>
          <div class="h-24 bg-gray-100 rounded-2xl animate-pulse"></div>
        </div>
      }

      @if (!pageLoading()) {
        <!-- Product details form -->
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 class="text-sm font-semibold text-gray-700 mb-5">Product Details</h2>

          @if (saveError()) {
            <div
              class="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl"
            >
              {{ saveError() }}
            </div>
          }

          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Name *</label>
                <input
                  type="text"
                  [(ngModel)]="name"
                  (ngModelChange)="onNameChange($event)"
                  placeholder="Product name"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Slug *</label>
                <input
                  type="text"
                  [(ngModel)]="slug"
                  placeholder="product-url-slug"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Brand</label>
                <input
                  type="text"
                  [(ngModel)]="brand"
                  placeholder="Brand name"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
                <select
                  [(ngModel)]="categoryId"
                  class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— No category —</option>
                  @for (cat of categories(); track cat.id) {
                    <option [value]="cat.id">{{ cat.name }}</option>
                  }
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
              <textarea
                [(ngModel)]="description"
                rows="3"
                placeholder="Product description…"
                class="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              ></textarea>
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                (click)="isPublished = !isPublished"
                class="relative inline-flex items-center w-10 h-5 rounded-full transition-colors focus:outline-none"
                [class.bg-indigo-600]="isPublished"
                [class.bg-gray-200]="!isPublished"
              >
                <span
                  class="w-4 h-4 bg-white rounded-full shadow transition-transform"
                  [class.translate-x-5]="isPublished"
                  [class.translate-x-0.5]="!isPublished"
                ></span>
              </button>
              <span class="text-sm text-gray-700">Published</span>
            </div>
          </div>

          <div class="flex gap-3 mt-6 pt-5 border-t border-gray-100">
            <button
              (click)="save()"
              [disabled]="saving()"
              class="px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {{ saving() ? 'Saving…' : isEditMode() ? 'Save Changes' : 'Create Product' }}
            </button>
            <a
              routerLink="/admin/products"
              class="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >Cancel</a
            >
          </div>
        </div>

        <!-- Variants section — only shown in edit mode after product is created -->
        @if (isEditMode()) {
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-sm font-semibold text-gray-700">Variants</h2>
              <button
                (click)="showAddVariant.set(true)"
                [disabled]="showAddVariant()"
                class="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-40"
              >
                + Add Variant
              </button>
            </div>

            <!-- Existing variants -->
            @if (variants().length === 0 && !showAddVariant()) {
              <p class="text-sm text-gray-400 text-center py-6">
                No variants yet. Add at least one variant so customers can purchase this product.
              </p>
            }

            <div class="space-y-3">
              @for (v of variants(); track v.id) {
                @if (editingVariantId() === v.id) {
                  <!-- Inline edit row -->
                  <div class="border border-indigo-200 rounded-xl p-4 bg-indigo-50/30">
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label class="block text-xs text-gray-500 mb-1">SKU *</label>
                        <input
                          type="text"
                          [(ngModel)]="editForm.sku"
                          class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-500 mb-1">Attribute key</label>
                        <input
                          type="text"
                          [(ngModel)]="editForm.attributeKey"
                          placeholder="e.g. color"
                          class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-500 mb-1">Attribute value</label>
                        <input
                          type="text"
                          [(ngModel)]="editForm.attributeVal"
                          placeholder="e.g. Red"
                          class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-500 mb-1">Price (₹) *</label>
                        <input
                          type="number"
                          [(ngModel)]="editForm.price"
                          min="0"
                          step="0.01"
                          class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-500 mb-1">Compare-at (₹)</label>
                        <input
                          type="number"
                          [(ngModel)]="editForm.compareAtPrice"
                          min="0"
                          step="0.01"
                          class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label class="block text-xs text-gray-500 mb-1">Stock qty</label>
                        <input
                          type="number"
                          [(ngModel)]="editForm.stockQty"
                          min="0"
                          class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    <div class="flex gap-2 mt-3">
                      <button
                        (click)="saveVariantEdit(v.id)"
                        [disabled]="variantSaving()"
                        class="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {{ variantSaving() ? 'Saving…' : 'Save' }}
                      </button>
                      <button
                        (click)="editingVariantId.set(null)"
                        class="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                } @else {
                  <!-- Display row -->
                  <div
                    class="flex items-center justify-between gap-4 border border-gray-100 rounded-xl px-4 py-3"
                  >
                    <div class="flex items-center gap-4 min-w-0">
                      <span class="font-mono text-xs text-gray-500 shrink-0">{{ v.sku }}</span>
                      @if (attrLabel(v)) {
                        <span class="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{{
                          attrLabel(v)
                        }}</span>
                      }
                      <span class="text-sm font-semibold text-gray-900">{{
                        +v.price | currency: 'INR' : 'symbol' : '1.2-2'
                      }}</span>
                      @if (v.compareAtPrice) {
                        <span class="text-xs text-gray-400 line-through">{{
                          +v.compareAtPrice | currency: 'INR' : 'symbol' : '1.0-0'
                        }}</span>
                      }
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                      <span
                        class="text-xs"
                        [class.text-green-600]="v.stockQty > 0"
                        [class.text-red-500]="v.stockQty === 0"
                      >
                        {{ v.stockQty }} in stock
                      </span>
                      <button
                        (click)="startEditVariant(v)"
                        class="text-xs text-indigo-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        (click)="deleteVariant(v.id)"
                        [disabled]="deletingVariantId() === v.id"
                        class="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                }
              }

              <!-- Add variant form -->
              @if (showAddVariant()) {
                <div class="border border-green-200 rounded-xl p-4 bg-green-50/30">
                  <p class="text-xs font-semibold text-gray-600 mb-3">New Variant</p>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">SKU *</label>
                      <input
                        type="text"
                        [(ngModel)]="addForm.sku"
                        placeholder="SKU-001"
                        class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Attribute key</label>
                      <input
                        type="text"
                        [(ngModel)]="addForm.attributeKey"
                        placeholder="e.g. color"
                        class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Attribute value</label>
                      <input
                        type="text"
                        [(ngModel)]="addForm.attributeVal"
                        placeholder="e.g. Red"
                        class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Price (₹) *</label>
                      <input
                        type="number"
                        [(ngModel)]="addForm.price"
                        min="0"
                        step="0.01"
                        placeholder="999.00"
                        class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Compare-at (₹)</label>
                      <input
                        type="number"
                        [(ngModel)]="addForm.compareAtPrice"
                        min="0"
                        step="0.01"
                        placeholder="Optional"
                        class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-gray-500 mb-1">Stock qty</label>
                      <input
                        type="number"
                        [(ngModel)]="addForm.stockQty"
                        min="0"
                        class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  @if (variantError()) {
                    <p class="mt-2 text-xs text-red-600">{{ variantError() }}</p>
                  }
                  <div class="flex gap-2 mt-3">
                    <button
                      (click)="addVariant()"
                      [disabled]="variantSaving()"
                      class="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {{ variantSaving() ? 'Adding…' : 'Add Variant' }}
                    </button>
                    <button
                      (click)="showAddVariant.set(false); variantError.set('')"
                      class="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class AdminProductFormComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly catalogService = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Mode
  readonly isEditMode = computed(() => !!this.productId);
  productId: string | null = null;

  // Page state
  readonly pageLoading = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');

  // Product form fields
  name = '';
  slug = '';
  brand = '';
  description = '';
  categoryId = '';
  isPublished = false;

  // Categories for dropdown
  readonly categories = signal<Category[]>([]);

  // Variants
  readonly variants = signal<ProductVariant[]>([]);
  readonly showAddVariant = signal(false);
  readonly editingVariantId = signal<string | null>(null);
  readonly variantSaving = signal(false);
  readonly variantError = signal('');
  readonly deletingVariantId = signal<string | null>(null);

  addForm: VariantForm = emptyVariantForm();
  editForm: VariantForm = emptyVariantForm();

  ngOnInit(): void {
    this.productId = this.route.snapshot.paramMap.get('id');
    this.loadCategories();
    if (this.productId) this.loadProduct(this.productId);
  }

  private loadCategories(): void {
    this.catalogService.getCategories().subscribe({
      next: (res) => this.categories.set(res.data.flatMap((c) => [c, ...(c.children ?? [])])),
    });
  }

  private loadProduct(id: string): void {
    this.pageLoading.set(true);
    this.adminService.getProduct(id).subscribe({
      next: (res) => {
        const p = res.data;
        this.name = p.name;
        this.slug = p.slug;
        this.brand = p.brand ?? '';
        this.description = p.description ?? '';
        this.categoryId = p.categoryId ?? '';
        this.isPublished = p.isPublished;
        this.variants.set(p.variants);
        this.pageLoading.set(false);
      },
      error: () => {
        this.pageLoading.set(false);
        this.router.navigate(['/admin/products']);
      },
    });
  }

  onNameChange(val: string): void {
    if (!this.isEditMode()) {
      this.slug = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    }
  }

  save(): void {
    if (!this.name.trim() || !this.slug.trim()) {
      this.saveError.set('Name and slug are required.');
      return;
    }
    this.saveError.set('');
    this.saving.set(true);

    const payload = {
      name: this.name.trim(),
      slug: this.slug.trim(),
      brand: this.brand.trim() || undefined,
      description: this.description.trim() || undefined,
      categoryId: this.categoryId || null,
      isPublished: this.isPublished,
    };

    const req$ = this.isEditMode()
      ? this.adminService.updateProduct(this.productId!, payload)
      : this.adminService.createProduct(payload);

    req$.subscribe({
      next: (res) => {
        this.saving.set(false);
        if (!this.isEditMode()) {
          this.router.navigate(['/admin/products', res.data.id, 'edit']);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.error?.formErrors?.[0] ?? 'Failed to save product.');
      },
    });
  }

  // ── Variants ─────────────────────────────────────────────────────────────

  addVariant(): void {
    if (!this.addForm.sku.trim() || !this.addForm.price) {
      this.variantError.set('SKU and price are required.');
      return;
    }
    this.variantError.set('');
    this.variantSaving.set(true);
    this.adminService.addVariant(this.productId!, toVariantPayload(this.addForm)).subscribe({
      next: (res) => {
        this.variants.update((v) => [...v, res.data]);
        this.addForm = emptyVariantForm();
        this.showAddVariant.set(false);
        this.variantSaving.set(false);
      },
      error: (err) => {
        this.variantSaving.set(false);
        this.variantError.set(err?.error?.error?.formErrors?.[0] ?? 'Failed to add variant.');
      },
    });
  }

  startEditVariant(v: ProductVariant): void {
    this.editForm = variantToForm(v);
    this.editingVariantId.set(v.id);
  }

  saveVariantEdit(variantId: string): void {
    this.variantSaving.set(true);
    this.adminService
      .updateVariant(this.productId!, variantId, toVariantPayload(this.editForm))
      .subscribe({
        next: (res) => {
          this.variants.update((rows) => rows.map((r) => (r.id === variantId ? res.data : r)));
          this.editingVariantId.set(null);
          this.variantSaving.set(false);
        },
        error: () => this.variantSaving.set(false),
      });
  }

  deleteVariant(variantId: string): void {
    if (!confirm('Delete this variant?')) return;
    this.deletingVariantId.set(variantId);
    this.adminService.deleteVariant(this.productId!, variantId).subscribe({
      next: () => {
        this.variants.update((rows) => rows.filter((r) => r.id !== variantId));
        this.deletingVariantId.set(null);
      },
      error: () => this.deletingVariantId.set(null),
    });
  }

  attrLabel(v: ProductVariant): string {
    return Object.entries(v.attributes ?? {})
      .map(([k, val]) => `${k}: ${val}`)
      .join(', ');
  }
}
