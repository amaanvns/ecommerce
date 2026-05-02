import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUserRow, PaginatedMeta } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe, TitleCasePipe, FormsModule],
  template: `
    <div class="p-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Users</h1>
        <div class="relative">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearch()"
            placeholder="Search by name or email…"
            class="text-sm border border-gray-200 rounded-lg pl-9 pr-4 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
          />
          <svg
            class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
        </div>
      </div>

      @if (loading()) {
        <div class="space-y-2">
          @for (_ of [1, 2, 3, 4, 5]; track $index) {
            <div class="h-12 bg-gray-100 rounded-xl animate-pulse"></div>
          }
        </div>
      }

      @if (!loading()) {
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 border-b border-gray-100">
                <tr class="text-left text-xs text-gray-500">
                  <th class="px-4 py-3 font-semibold">User</th>
                  <th class="px-4 py-3 font-semibold">Role</th>
                  <th class="px-4 py-3 font-semibold">Orders</th>
                  <th class="px-4 py-3 font-semibold">Joined</th>
                  <th class="px-4 py-3 font-semibold">Status</th>
                  <th class="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                @for (user of users(); track user.id) {
                  <tr
                    class="hover:bg-gray-50 transition-colors"
                    [class.opacity-50]="togglingId() === user.id"
                  >
                    <td class="px-4 py-3">
                      <p class="font-medium text-gray-900">{{ user.name }}</p>
                      <p class="text-xs text-gray-400">{{ user.email }}</p>
                    </td>
                    <td class="px-4 py-3">
                      <span
                        class="px-2 py-0.5 rounded-full text-xs font-semibold"
                        [class.bg-purple-100]="user.role === 'super_admin'"
                        [class.text-purple-700]="user.role === 'super_admin'"
                        [class.bg-indigo-100]="user.role === 'admin'"
                        [class.text-indigo-700]="user.role === 'admin'"
                        [class.bg-gray-100]="user.role === 'customer'"
                        [class.text-gray-600]="user.role === 'customer'"
                        >{{ user.role | titlecase }}</span
                      >
                    </td>
                    <td class="px-4 py-3 text-gray-600 text-center">{{ user.orderCount }}</td>
                    <td class="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {{ user.createdAt | date: 'dd MMM yyyy' }}
                    </td>
                    <td class="px-4 py-3">
                      @if (user.isBlocked) {
                        <span
                          class="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600"
                          >Blocked</span
                        >
                      } @else {
                        <span
                          class="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700"
                          >Active</span
                        >
                      }
                    </td>
                    <td class="px-4 py-3">
                      <button
                        (click)="toggleBlock(user)"
                        [disabled]="togglingId() === user.id"
                        class="text-xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-50"
                        [class.border-red-100]="!user.isBlocked"
                        [class.text-red-500]="!user.isBlocked"
                        [class.hover:border-red-200]="!user.isBlocked"
                        [class.border-gray-200]="user.isBlocked"
                        [class.text-gray-600]="user.isBlocked"
                        [class.hover:bg-gray-50]="user.isBlocked"
                      >
                        {{ user.isBlocked ? 'Unblock' : 'Block' }}
                      </button>
                    </td>
                  </tr>
                }
                @if (users().length === 0) {
                  <tr>
                    <td colspan="6" class="px-4 py-12 text-center text-gray-400 text-sm">
                      No users found
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        @if (meta(); as m) {
          @if (m.totalPages > 1) {
            <div class="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span
                >{{ (m.page - 1) * m.limit + 1 }}–{{ min(m.page * m.limit, m.total) }} of
                {{ m.total }}</span
              >
              <div class="flex gap-2">
                <button
                  (click)="goToPage(m.page - 1)"
                  [disabled]="m.page === 1"
                  class="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  (click)="goToPage(m.page + 1)"
                  [disabled]="m.page === m.totalPages"
                  class="px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          }
        }
      }
    </div>
  `,
})
export class AdminUsersComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly users = signal<AdminUserRow[]>([]);
  readonly meta = signal<PaginatedMeta | null>(null);
  readonly loading = signal(true);
  readonly togglingId = signal<string | null>(null);

  searchQuery = '';
  currentPage = 1;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.load();
  }

  onSearch(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.load();
    }, 350);
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminService.getUsers(this.currentPage, 20, this.searchQuery || undefined).subscribe({
      next: (res) => {
        this.users.set(res.data);
        this.meta.set(res.meta);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggleBlock(user: AdminUserRow): void {
    this.togglingId.set(user.id);
    this.adminService.toggleBlockUser(user.id).subscribe({
      next: (res) => {
        this.users.update((rows) =>
          rows.map((r) => (r.id === user.id ? { ...r, isBlocked: res.data.isBlocked } : r)),
        );
        this.togglingId.set(null);
      },
      error: () => this.togglingId.set(null),
    });
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
