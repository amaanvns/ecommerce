import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CartDrawerComponent } from '../../shared/components/cart-drawer/cart-drawer.component';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, NavbarComponent, CartDrawerComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-paper text-ink">
      <app-navbar />

      <main class="flex-1">
        <router-outlet />
      </main>

      <footer class="border-t border-ink-200 mt-32">
        <div class="container-edge py-20">
          <!-- Newsletter -->
          <div class="grid lg:grid-cols-2 gap-12 pb-16">
            <div>
              <h3
                class="text-3xl md:text-4xl font-light leading-tight tracking-tighter max-w-md text-balance"
              >
                Be the first to know.
              </h3>
              <p class="mt-4 text-ink-500 max-w-sm">
                A monthly note when something new arrives. No filler.
              </p>
            </div>
            <form class="flex items-end gap-4 max-w-md w-full self-end">
              <div class="flex-1">
                <label class="label-input">Email Address</label>
                <input type="email" placeholder="you@example.com" class="input-clean" />
              </div>
              <button type="submit" class="btn-primary">Subscribe</button>
            </form>
          </div>

          <!-- Link columns -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-8 py-16 border-t border-ink-200">
            <div>
              <p class="label mb-5">Shop</p>
              <ul class="space-y-3 text-sm text-ink-500">
                <li><a routerLink="/products" class="hover:text-ink transition-colors">All</a></li>
                <li><a routerLink="/products" class="hover:text-ink transition-colors">New</a></li>
                <li><a routerLink="/products" class="hover:text-ink transition-colors">Sale</a></li>
                <li>
                  <a routerLink="/products" class="hover:text-ink transition-colors">Gift Cards</a>
                </li>
              </ul>
            </div>
            <div>
              <p class="label mb-5">Studio</p>
              <ul class="space-y-3 text-sm text-ink-500">
                <li><a class="hover:text-ink transition-colors">Our Story</a></li>
                <li><a class="hover:text-ink transition-colors">Journal</a></li>
                <li><a class="hover:text-ink transition-colors">Sustainability</a></li>
                <li><a class="hover:text-ink transition-colors">Stockists</a></li>
              </ul>
            </div>
            <div>
              <p class="label mb-5">Service</p>
              <ul class="space-y-3 text-sm text-ink-500">
                <li><a class="hover:text-ink transition-colors">Contact</a></li>
                <li><a class="hover:text-ink transition-colors">Shipping</a></li>
                <li><a class="hover:text-ink transition-colors">Returns</a></li>
                <li><a class="hover:text-ink transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p class="label mb-5">Follow</p>
              <ul class="space-y-3 text-sm text-ink-500">
                <li><a class="hover:text-ink transition-colors">Instagram</a></li>
                <li><a class="hover:text-ink transition-colors">Pinterest</a></li>
                <li><a class="hover:text-ink transition-colors">YouTube</a></li>
              </ul>
            </div>
          </div>

          <!-- Bottom -->
          <div
            class="flex flex-col md:flex-row gap-4 items-center justify-between pt-8 border-t border-ink-200 text-2xs uppercase tracking-widest text-ink-400"
          >
            <p class="font-medium tracking-[0.32em] text-ink normal-case">SHOPZONE</p>
            <p>&copy; {{ year }} · All rights reserved</p>
            <div class="flex gap-6">
              <a class="hover:text-ink transition-colors">Privacy</a>
              <a class="hover:text-ink transition-colors">Terms</a>
              <a class="hover:text-ink transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>

    @if (cart.isOpen()) {
      <app-cart-drawer />
    }
  `,
})
export class MainLayoutComponent {
  readonly cart = inject(CartService);
  readonly year = new Date().getFullYear();
}
