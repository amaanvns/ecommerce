import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CartDrawerComponent } from '../../shared/components/cart-drawer/cart-drawer.component';
import { CartService } from '../../core/services/cart.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, NavbarComponent, CartDrawerComponent],
  template: `
    <div class="min-h-screen flex flex-col bg-gray-50">
      <app-navbar />
      <main class="flex-1">
        <router-outlet />
      </main>
      <footer class="bg-white border-t border-gray-200 py-6 mt-auto">
        <div class="max-w-7xl mx-auto px-4 text-center text-sm text-gray-400">
          &copy; {{ year }} ShopZone. All rights reserved.
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
