import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CatalogService, Category, ProductSummary } from '../../core/services/catalog.service';
import { SeoService } from '../../core/services/seo.service';
import { ProductCardComponent } from '../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ProductCardComponent],
  template: `
    <!-- ════════════════════════════════════════════════════════════
         HERO — generous, centered, restrained
         ════════════════════════════════════════════════════════════ -->
    <section class="container-edge pt-20 lg:pt-28 pb-16 lg:pb-24">
      <div class="max-w-4xl">
        <p class="label mb-8">New arrivals · 2026</p>
        <h1 class="text-display font-light text-ink text-balance">
          Considered objects, made well, kept long.
        </h1>
        <p class="mt-10 text-ink-500 max-w-md text-lg leading-relaxed">
          A small, slow edit of pieces — designed to be lived with, mended, and passed on.
        </p>
        <div class="mt-12 flex items-center gap-8">
          <a routerLink="/products" class="btn-primary">Shop Now</a>
          <a
            routerLink="/products"
            class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
            >Read our story</a
          >
        </div>
      </div>
    </section>

    <!-- Hero image — edge to edge, breathing -->
    <section class="container-edge pb-24 lg:pb-32">
      <div class="aspect-[16/9] lg:aspect-[21/9] hover-zoom bg-ink-50">
        <img
          src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80"
          srcset="
            https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=75   800w,
            https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80 1200w,
            https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1800&q=80 1800w,
            https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=2400&q=80 2400w
          "
          sizes="(min-width: 1280px) 1240px, 100vw"
          alt="The new collection"
          class="w-full h-full object-cover"
          fetchpriority="high"
          decoding="async"
        />
      </div>
      <div class="mt-6 flex items-baseline justify-between text-sm">
        <p class="text-ink">The Autumn Collection</p>
        <p class="text-ink-400">Photographed in Lisbon</p>
      </div>
    </section>

    <!-- ════════════════════════════════════════════════════════════
         FEATURED — clean grid, lots of space
         ════════════════════════════════════════════════════════════ -->
    <section class="container-edge pb-24 lg:pb-32">
      <div class="flex items-end justify-between mb-16">
        <h2 class="text-4xl md:text-5xl font-light tracking-tighter">New arrivals</h2>
        <a
          routerLink="/products"
          class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
          >View all →</a
        >
      </div>

      @if (loading()) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
          @for (_ of [1, 2, 3, 4]; track $index) {
            <div class="animate-pulse">
              <div class="aspect-[4/5] bg-ink-100 mb-5"></div>
              <div class="h-3 bg-ink-100 w-2/3 mb-2"></div>
              <div class="h-3 bg-ink-100 w-1/3"></div>
            </div>
          }
        </div>
      } @else if (featured().length > 0) {
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-16">
          @for (p of featured(); track p.id) {
            <app-product-card [product]="p" />
          }
        </div>
      }
    </section>

    <!-- ════════════════════════════════════════════════════════════
         CATEGORIES — clean two-up grid
         ════════════════════════════════════════════════════════════ -->
    @if (categories().length > 0) {
      <section class="container-edge pb-24 lg:pb-32">
        <h2 class="text-4xl md:text-5xl font-light tracking-tighter mb-16 max-w-2xl">
          Browse by category.
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          @for (cat of categories().slice(0, 4); track cat.id; let i = $index) {
            <a
              [routerLink]="['/products']"
              [queryParams]="{ category: cat.slug }"
              class="group block"
            >
              <div class="aspect-[4/3] hover-zoom bg-ink-50 mb-5">
                <img
                  [src]="cat.imageUrl || categoryFallback(i)"
                  [alt]="cat.name"
                  class="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div class="flex items-baseline justify-between">
                <h3
                  class="text-2xl font-light tracking-tight group-hover:text-ink-500 transition-colors"
                >
                  {{ cat.name }}
                </h3>
                <span class="text-sm text-ink-400 group-hover:text-ink transition-colors"
                  >Shop →</span
                >
              </div>
            </a>
          }
        </div>
      </section>
    }

    <!-- ════════════════════════════════════════════════════════════
         PHILOSOPHY — quiet split section
         ════════════════════════════════════════════════════════════ -->
    <section class="container-edge py-24 lg:py-40">
      <div class="grid lg:grid-cols-12 gap-12 lg:gap-20 items-center">
        <div class="lg:col-span-5 lg:col-start-1">
          <div class="aspect-[4/5] hover-zoom bg-ink-50">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1000&q=80"
              alt="Atelier"
              class="w-full h-full object-cover"
            />
          </div>
        </div>
        <div class="lg:col-span-6 lg:col-start-7">
          <p class="label mb-8">Our Approach</p>
          <h2
            class="text-4xl md:text-5xl lg:text-6xl font-light tracking-tighter leading-[1.05] text-balance"
          >
            We don't chase seasons. We choose things that last.
          </h2>
          <p class="mt-10 text-ink-500 max-w-md leading-relaxed">
            Every piece is selected by a small team. We work directly with makers, in small runs,
            with full traceability — and stand behind everything we sell, for as long as you own it.
          </p>

          <ul class="mt-12 divide-y divide-ink-200 border-t border-ink-200">
            @for (feat of features; track feat.title) {
              <li class="py-5 flex items-baseline justify-between gap-6">
                <span class="text-base text-ink">{{ feat.title }}</span>
                <span class="text-sm text-ink-500 text-right max-w-xs">{{ feat.desc }}</span>
              </li>
            }
          </ul>
        </div>
      </div>
    </section>

    <!-- ════════════════════════════════════════════════════════════
         CTA — quiet, full-width, no bombast
         ════════════════════════════════════════════════════════════ -->
    <section class="border-t border-ink-200">
      <div class="container-edge py-32 lg:py-40 text-center">
        <h2
          class="text-4xl md:text-6xl lg:text-7xl font-light tracking-tighter text-balance max-w-3xl mx-auto leading-[1.05]"
        >
          The next thing you'll keep forever.
        </h2>
        <div class="mt-14 flex items-center justify-center gap-8">
          <a routerLink="/products" class="btn-primary">Shop The Collection</a>
          @if (!auth.isAuthenticated()) {
            <a
              routerLink="/auth/register"
              class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
              >Become a member →</a
            >
          }
        </div>
      </div>
    </section>
  `,
})
export class HomeComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);
  private readonly seo = inject(SeoService);

  readonly categories = signal<Category[]>([]);
  readonly featured = signal<ProductSummary[]>([]);
  readonly loading = signal(true);

  readonly features = [
    { title: 'Considered selection', desc: 'Vetted by our team — every piece' },
    { title: 'Made with care', desc: 'Small batch, traceable origins' },
    { title: 'Lasting support', desc: '30-day returns, lifetime repair' },
  ];

  private readonly fallbacks = [
    'https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=1200&q=80',
    'https://images.unsplash.com/photo-1551803091-e20673f15770?w=1200&q=80',
    'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1200&q=80',
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80',
  ];

  categoryFallback(i: number): string {
    return this.fallbacks[i % this.fallbacks.length];
  }

  ngOnInit(): void {
    this.seo.apply({
      title: 'Considered objects, made well',
      description:
        'A small, slow edit of pieces — designed to be lived with, mended, and passed on.',
      url: '/',
      type: 'website',
    });
    this.seo.setJsonLd([
      { '@type': 'WebSite', name: 'Star Enterprises', url: '/' },
      { '@type': 'Organization', name: 'Star Enterprises', url: '/' },
    ]);

    this.catalog.getCategories().subscribe((res) => this.categories.set(res.data));
    this.catalog.getProducts({ limit: 4, sort: 'newest' }).subscribe({
      next: (res) => {
        this.featured.set(res.data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
