import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <!-- Hero -->
      <div class="text-center py-20 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl mb-12">
        <h1 class="text-5xl font-bold text-gray-900 mb-4">Discover Amazing Products</h1>
        <p class="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
          Shop the latest trends with fast delivery, easy returns, and unbeatable prices.
        </p>
        <div class="flex items-center justify-center gap-4">
          <a
            routerLink="/products"
            class="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
          >
            Shop Now
          </a>
          @if (!auth.isAuthenticated()) {
            <a
              routerLink="/auth/register"
              class="border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              Create Account
            </a>
          }
        </div>
      </div>

      <!-- Feature cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        @for (feat of features; track feat.title) {
          <div class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
            <div class="text-4xl mb-3">{{ feat.icon }}</div>
            <h3 class="font-semibold text-gray-900 mb-1">{{ feat.title }}</h3>
            <p class="text-sm text-gray-500">{{ feat.desc }}</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class HomeComponent {
  readonly auth = inject(AuthService);
  readonly features = [
    { icon: '🚀', title: 'Fast Delivery', desc: 'Get your orders delivered in 2–5 business days.' },
    { icon: '🔒', title: 'Secure Payments', desc: 'Your payment information is always protected.' },
    { icon: '🔄', title: 'Easy Returns', desc: '30-day hassle-free return policy on all items.' },
  ];
}
