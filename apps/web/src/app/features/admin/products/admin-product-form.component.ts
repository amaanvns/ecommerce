import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import {
  AdminService,
  ProductImage,
  ProductVariant,
  VariantPayload,
} from '../../../core/services/admin.service';
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
    <section class="border-b border-ink-200 bg-paper">
      <div class="px-4 sm:px-6 lg:px-10 py-12">
        <a
          routerLink="/admin/products"
          class="text-2xs uppercase tracking-widest link-underline mb-4 inline-block"
          >← All Products</a
        >
        <p class="label mb-3">— Studio · {{ isEditMode() ? 'Edit' : 'Create' }}</p>
        <h1 class="font-light text-5xl">
          {{ isEditMode() ? 'Edit product.' : 'New product.' }}
        </h1>
      </div>
    </section>

    <div class="px-4 sm:px-6 lg:px-10 py-10 max-w-4xl">
      @if (pageLoading()) {
        <div class="space-y-4">
          <div class="h-12 bg-ink-50 animate-pulse"></div>
          <div class="h-12 bg-ink-50 animate-pulse"></div>
          <div class="h-32 bg-ink-50 animate-pulse"></div>
        </div>
      }

      @if (!pageLoading()) {
        <!-- Details -->
        <p class="label mb-6">— 01 / Details</p>

        @if (saveError()) {
          <div class="mb-6 border-l-2 border-ink bg-ink-50 px-4 py-3 text-sm text-ink-700">
            {{ saveError() }}
          </div>
        }

        <div class="space-y-7 pb-10 border-b border-ink-200">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label class="label-input">Name *</label>
              <input
                type="text"
                [(ngModel)]="name"
                (ngModelChange)="onNameChange($event)"
                placeholder="Product name"
                class="input-clean"
              />
            </div>
            <div>
              <label class="label-input">Slug *</label>
              <input
                type="text"
                [(ngModel)]="slug"
                placeholder="product-url-slug"
                class="input-clean font-mono"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label class="label-input">Brand</label>
              <input type="text" [(ngModel)]="brand" placeholder="Brand name" class="input-clean" />
            </div>
            <div>
              <label class="label-input">Category</label>
              <select [(ngModel)]="categoryId" class="input-clean bg-transparent">
                <option value="">— No category —</option>
                @for (cat of categories(); track cat.id) {
                  <option [value]="cat.id">{{ cat.name }}</option>
                }
              </select>
            </div>
          </div>

          <div>
            <label class="label-input">Description</label>
            <textarea
              [(ngModel)]="description"
              rows="4"
              placeholder="Considered, evocative copy that captures the piece…"
              class="input-clean resize-none"
            ></textarea>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              (click)="isPublished = !isPublished"
              class="relative inline-flex items-center w-10 h-5 transition-colors focus:outline-none"
              [class.bg-ink]="isPublished"
              [class.bg-ink-200]="!isPublished"
            >
              <span
                class="w-4 h-4 bg-paper transition-transform"
                [class.translate-x-5]="isPublished"
                [class.translate-x-0.5]="!isPublished"
              ></span>
            </button>
            <span class="text-2xs uppercase tracking-widest">Published</span>
          </div>
        </div>

        <div class="flex gap-4 py-8">
          <button (click)="save()" [disabled]="saving()" class="btn-primary">
            {{ saving() ? 'Saving…' : isEditMode() ? 'Save Changes' : 'Create Product' }}
          </button>
          <a routerLink="/admin/products" class="btn-outline">Cancel</a>
        </div>

        <!-- Images -->
        @if (isEditMode()) {
          <div class="mt-12 pt-10 border-t border-ink-200">
            <div class="flex items-center justify-between mb-8">
              <h2 class="text-2xl font-light tracking-tight">Images</h2>
              <span class="text-sm text-ink-500 tabular">{{ images().length }} added</span>
            </div>

            @if (imageError()) {
              <p class="mb-4 bg-ink-50 px-4 py-3 text-sm text-ink rounded">{{ imageError() }}</p>
            }

            <!-- Add image -->
            <div class="grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] gap-4 items-end mb-8">
              <div>
                <label class="label-input">Image URL</label>
                <input
                  type="url"
                  [(ngModel)]="newImageUrl"
                  placeholder="https://…"
                  class="input-clean"
                />
              </div>
              <div>
                <label class="label-input">Alt text (optional)</label>
                <input
                  type="text"
                  [(ngModel)]="newImageAlt"
                  placeholder="Describe the image"
                  class="input-clean"
                />
              </div>
              <button
                type="button"
                (click)="addImage()"
                [disabled]="addingImage() || !newImageUrl.trim()"
                class="btn-outline self-end pb-3"
              >
                {{ addingImage() ? 'Adding…' : 'Add' }}
              </button>
            </div>

            @if (images().length === 0) {
              <p class="text-sm text-ink-500 py-12 text-center border border-ink-200 rounded">
                No images yet. The first image will appear as the product thumbnail.
              </p>
            } @else {
              <div class="space-y-3">
                @for (img of images(); track img.id; let i = $index; let last = $last) {
                  <div
                    class="grid grid-cols-[5rem_1fr_auto] gap-5 items-center bg-ink-50/40 px-4 py-3 rounded"
                  >
                    <div class="aspect-[4/5] w-20 bg-ink-100 overflow-hidden">
                      <img
                        [src]="img.url"
                        [alt]="img.alt ?? ''"
                        class="w-full h-full object-cover"
                      />
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs text-ink-400 truncate">{{ img.url }}</p>
                      <input
                        type="text"
                        [value]="img.alt ?? ''"
                        (blur)="updateAlt(img, $any($event.target).value)"
                        placeholder="Alt text"
                        class="input-clean text-sm py-1.5"
                      />
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <button
                        (click)="moveImage(i, -1)"
                        [disabled]="i === 0 || reordering()"
                        class="text-sm text-ink-500 hover:text-ink transition-colors disabled:opacity-30"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        (click)="moveImage(i, 1)"
                        [disabled]="last || reordering()"
                        class="text-sm text-ink-500 hover:text-ink transition-colors disabled:opacity-30"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        (click)="deleteImage(img)"
                        [disabled]="deletingImageId() === img.id"
                        class="ml-2 text-sm text-ink-400 hover:text-ink transition-colors link-underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Variants -->
        @if (isEditMode()) {
          <div class="mt-12 pt-10 border-t border-ink-200">
            <div class="flex items-center justify-between mb-8">
              <p class="label">— 02 / Variants</p>
              <button
                (click)="showAddVariant.set(true)"
                [disabled]="showAddVariant()"
                class="text-2xs uppercase tracking-widest link-underline disabled:opacity-40"
              >
                + Add Variant
              </button>
            </div>

            @if (variants().length === 0 && !showAddVariant()) {
              <p class="text-ink-500 text-center py-12 border border-ink-200">
                No variants yet. Add at least one so customers can purchase this product.
              </p>
            }

            <div class="space-y-3">
              @for (v of variants(); track v.id) {
                @if (editingVariantId() === v.id) {
                  <div class="border border-ink p-6 bg-ink-50">
                    <p class="label mb-4">— Editing variant</p>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-5">
                      <div>
                        <label class="label-input">SKU *</label>
                        <input
                          type="text"
                          [(ngModel)]="editForm.sku"
                          class="input-clean font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label class="label-input">Attribute key</label>
                        <input
                          type="text"
                          [(ngModel)]="editForm.attributeKey"
                          placeholder="e.g. color"
                          class="input-clean"
                        />
                      </div>
                      <div>
                        <label class="label-input">Attribute value</label>
                        <input
                          type="text"
                          [(ngModel)]="editForm.attributeVal"
                          placeholder="e.g. Bone"
                          class="input-clean"
                        />
                      </div>
                      <div>
                        <label class="label-input">Price (₹) *</label>
                        <input
                          type="number"
                          [(ngModel)]="editForm.price"
                          min="0"
                          step="0.01"
                          class="input-clean font-mono"
                        />
                      </div>
                      <div>
                        <label class="label-input">Compare-at (₹)</label>
                        <input
                          type="number"
                          [(ngModel)]="editForm.compareAtPrice"
                          min="0"
                          step="0.01"
                          class="input-clean font-mono"
                        />
                      </div>
                      <div>
                        <label class="label-input">Stock</label>
                        <input
                          type="number"
                          [(ngModel)]="editForm.stockQty"
                          min="0"
                          class="input-clean font-mono"
                        />
                      </div>
                    </div>
                    <div class="flex gap-3 mt-6">
                      <button
                        (click)="saveVariantEdit(v.id)"
                        [disabled]="variantSaving()"
                        class="btn-primary"
                      >
                        {{ variantSaving() ? 'Saving…' : 'Save Variant' }}
                      </button>
                      <button (click)="editingVariantId.set(null)" class="btn-outline">
                        Cancel
                      </button>
                    </div>
                  </div>
                } @else {
                  <div
                    class="grid grid-cols-12 items-center gap-4 border border-ink-200 px-5 py-4 hover:bg-ink-50 transition-colors"
                  >
                    <span class="col-span-3 font-mono text-xs">{{ v.sku }}</span>
                    <span class="col-span-3 text-2xs uppercase tracking-widest text-ink-500">
                      @if (attrLabel(v)) {
                        {{ attrLabel(v) }}
                      } @else {
                        —
                      }
                    </span>
                    <div class="col-span-2 font-mono text-sm">
                      {{ +v.price | currency: 'INR' : 'symbol' : '1.2-2' }}
                      @if (v.compareAtPrice) {
                        <span class="block text-2xs text-ink-400 line-through">
                          {{ +v.compareAtPrice | currency: 'INR' : 'symbol' : '1.0-0' }}
                        </span>
                      }
                    </div>
                    <span
                      class="col-span-2 text-2xs uppercase tracking-widest"
                      [class.text-ink]="v.stockQty === 0"
                      >{{ v.stockQty }} In Stock</span
                    >
                    <div class="col-span-2 flex items-center justify-end gap-4">
                      <button
                        (click)="startEditVariant(v)"
                        class="text-2xs uppercase tracking-widest link-underline"
                      >
                        Edit
                      </button>
                      <button
                        (click)="deleteVariant(v.id)"
                        [disabled]="deletingVariantId() === v.id"
                        class="text-2xs uppercase tracking-widest text-ink hover:text-ink transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                }
              }

              @if (showAddVariant()) {
                <div class="border border-ink p-6 bg-ink-50">
                  <p class="label mb-4">— New Variant</p>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    <div>
                      <label class="label-input">SKU *</label>
                      <input
                        type="text"
                        [(ngModel)]="addForm.sku"
                        placeholder="SKU-001"
                        class="input-clean font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label class="label-input">Attribute key</label>
                      <input
                        type="text"
                        [(ngModel)]="addForm.attributeKey"
                        placeholder="e.g. color"
                        class="input-clean"
                      />
                    </div>
                    <div>
                      <label class="label-input">Attribute value</label>
                      <input
                        type="text"
                        [(ngModel)]="addForm.attributeVal"
                        placeholder="e.g. Bone"
                        class="input-clean"
                      />
                    </div>
                    <div>
                      <label class="label-input">Price (₹) *</label>
                      <input
                        type="number"
                        [(ngModel)]="addForm.price"
                        min="0"
                        step="0.01"
                        placeholder="999.00"
                        class="input-clean font-mono"
                      />
                    </div>
                    <div>
                      <label class="label-input">Compare-at (₹)</label>
                      <input
                        type="number"
                        [(ngModel)]="addForm.compareAtPrice"
                        min="0"
                        step="0.01"
                        placeholder="Optional"
                        class="input-clean font-mono"
                      />
                    </div>
                    <div>
                      <label class="label-input">Stock</label>
                      <input
                        type="number"
                        [(ngModel)]="addForm.stockQty"
                        min="0"
                        class="input-clean font-mono"
                      />
                    </div>
                  </div>
                  @if (variantError()) {
                    <p class="mt-4 text-xs text-ink">{{ variantError() }}</p>
                  }
                  <div class="flex gap-3 mt-6">
                    <button (click)="addVariant()" [disabled]="variantSaving()" class="btn-primary">
                      {{ variantSaving() ? 'Adding…' : 'Add Variant' }}
                    </button>
                    <button
                      (click)="showAddVariant.set(false); variantError.set('')"
                      class="btn-outline"
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

  readonly isEditMode = computed(() => !!this.productId);
  productId: string | null = null;

  readonly pageLoading = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal('');

  name = '';
  slug = '';
  brand = '';
  description = '';
  categoryId = '';
  isPublished = false;

  readonly categories = signal<Category[]>([]);

  readonly variants = signal<ProductVariant[]>([]);
  readonly showAddVariant = signal(false);
  readonly editingVariantId = signal<string | null>(null);
  readonly variantSaving = signal(false);
  readonly variantError = signal('');
  readonly deletingVariantId = signal<string | null>(null);

  // Images
  readonly images = signal<ProductImage[]>([]);
  readonly addingImage = signal(false);
  readonly reordering = signal(false);
  readonly deletingImageId = signal<string | null>(null);
  readonly imageError = signal('');
  newImageUrl = '';
  newImageAlt = '';

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
        this.images.set(p.images ?? []);
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

  // ── Images ──────────────────────────────────────────────────────────────

  addImage(): void {
    const url = this.newImageUrl.trim();
    if (!url) return;
    this.imageError.set('');
    this.addingImage.set(true);
    this.adminService
      .addImage(this.productId!, url, this.newImageAlt.trim() || undefined)
      .subscribe({
        next: (res) => {
          this.images.update((rows) => [...rows, res.data]);
          this.newImageUrl = '';
          this.newImageAlt = '';
          this.addingImage.set(false);
        },
        error: (err) => {
          this.addingImage.set(false);
          const flat = err?.error?.error;
          const msg =
            (flat?.fieldErrors?.url?.[0] as string | undefined) ||
            (typeof flat === 'string' ? flat : 'Could not add image — check the URL.');
          this.imageError.set(msg);
        },
      });
  }

  updateAlt(img: ProductImage, newAlt: string): void {
    const trimmed = newAlt.trim();
    if ((img.alt ?? '') === trimmed) return;
    this.adminService.updateImage(this.productId!, img.id, { alt: trimmed || null }).subscribe({
      next: (res) => {
        this.images.update((rows) => rows.map((r) => (r.id === img.id ? res.data : r)));
      },
    });
  }

  moveImage(index: number, direction: -1 | 1): void {
    const list = [...this.images()];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    // Optimistic
    this.images.set(list);
    this.reordering.set(true);
    this.adminService
      .reorderImages(
        this.productId!,
        list.map((i) => i.id),
      )
      .subscribe({
        next: (res) => {
          this.images.set(res.data);
          this.reordering.set(false);
        },
        error: () => {
          // Revert on failure by reloading
          this.reordering.set(false);
          if (this.productId) this.loadProduct(this.productId);
        },
      });
  }

  deleteImage(img: ProductImage): void {
    if (!confirm('Remove this image?')) return;
    this.deletingImageId.set(img.id);
    this.adminService.deleteImage(this.productId!, img.id).subscribe({
      next: () => {
        this.images.update((rows) => rows.filter((r) => r.id !== img.id));
        this.deletingImageId.set(null);
      },
      error: () => this.deletingImageId.set(null),
    });
  }
}
