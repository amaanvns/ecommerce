import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-account',
  template: `
    <div class="max-w-3xl mx-auto px-4 py-10">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">My Account</h1>
      <div
        class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5"
      >
        <div
          class="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-xl"
        >
          {{ initials() }}
        </div>
        <div>
          <p class="font-semibold text-gray-900 text-lg">{{ auth.currentUser()?.name }}</p>
          <p class="text-sm text-gray-500">{{ auth.currentUser()?.email }}</p>
          <span
            class="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium"
            [class]="roleBadge()"
          >
            {{ auth.currentUser()?.role }}
          </span>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        @for (item of menuItems; track item.label) {
          <div
            class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-indigo-200 cursor-pointer transition-colors"
          >
            <span class="text-2xl">{{ item.icon }}</span>
            <div>
              <p class="font-medium text-sm text-gray-900">{{ item.label }}</p>
              <p class="text-xs text-gray-400">{{ item.desc }}</p>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class AccountComponent {
  readonly auth = inject(AuthService);

  initials() {
    return (this.auth.currentUser()?.name ?? '')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  roleBadge() {
    const role = this.auth.currentUser()?.role;
    if (role === 'admin' || role === 'super_admin') return 'bg-purple-100 text-purple-700';
    return 'bg-green-100 text-green-700';
  }

  readonly menuItems = [
    { icon: '📦', label: 'My Orders', desc: 'Track and manage your orders' },
    { icon: '📍', label: 'Addresses', desc: 'Manage your shipping addresses' },
    { icon: '❤️', label: 'Wishlist', desc: 'Items you love' },
    { icon: '⚙️', label: 'Settings', desc: 'Account preferences' },
  ];
}
