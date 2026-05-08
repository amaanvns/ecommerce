import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUserRow, PaginatedMeta } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe, TitleCasePipe, FormsModule],
  template: `
    <section class="border-b border-ink-200 bg-paper">
      <div class="px-10 py-12 flex items-end justify-between gap-6">
        <div>
          <p class="label mb-3">— Studio · People</p>
          <h1 class="font-light text-5xl">Customers.</h1>
        </div>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearch()"
          placeholder="Search by name or email…"
          class="bg-transparent border-0 border-b border-ink-300 text-sm focus:border-ink focus:ring-0 focus:outline-none w-64 px-0 py-2"
        />
      </div>
    </section>

    <div class="px-10 py-10">
      @if (loading()) {
        <div class="space-y-px">
          @for (_ of [1, 2, 3, 4, 5]; track $index) {
            <div class="h-16 bg-ink-50 animate-pulse"></div>
          }
        </div>
      }

      @if (!loading()) {
        <table class="w-full">
          <thead>
            <tr class="border-b border-ink text-left">
              <th class="pb-3 label">Customer</th>
              <th class="pb-3 label">Role</th>
              <th class="pb-3 label text-center">Orders</th>
              <th class="pb-3 label">Joined</th>
              <th class="pb-3 label">Status</th>
              <th class="pb-3 label text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            @for (user of users(); track user.id) {
              <tr
                class="border-b border-ink-200 hover:bg-ink-50 transition-colors"
                [class.opacity-50]="togglingId() === user.id"
              >
                <td class="py-4">
                  <p class="text-base leading-tight">{{ user.name }}</p>
                  <p class="text-2xs uppercase tracking-widest text-ink-400 mt-0.5">
                    {{ user.email }}
                  </p>
                </td>
                <td class="py-4">
                  <span class="badge border" [class]="roleClass(user.role)">{{
                    user.role | titlecase
                  }}</span>
                </td>
                <td class="py-4 font-mono text-sm text-center">{{ user.orderCount }}</td>
                <td class="py-4 text-sm text-ink-500 whitespace-nowrap">
                  {{ user.createdAt | date: 'dd MMM yyyy' }}
                </td>
                <td class="py-4">
                  @if (user.isBlocked) {
                    <span class="badge border border-ink text-ink">Blocked</span>
                  } @else {
                    <span class="badge border border-ink text-ink">Active</span>
                  }
                </td>
                <td class="py-4 text-right">
                  <button
                    (click)="toggleBlock(user)"
                    [disabled]="togglingId() === user.id"
                    class="text-2xs uppercase tracking-widest transition-colors disabled:opacity-50"
                    [class.text-ink]="!user.isBlocked"
                    [class.hover:text-ink]="!user.isBlocked"
                    [class.text-ink-500]="user.isBlocked"
                    [class.hover:text-ink]="user.isBlocked"
                  >
                    {{ user.isBlocked ? 'Unblock' : 'Block' }}
                  </button>
                </td>
              </tr>
            }
            @if (users().length === 0) {
              <tr>
                <td colspan="6" class="py-16 text-center">
                  <p class="text-3xl font-light">No customers.</p>
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (meta(); as m) {
          @if (m.totalPages > 1) {
            <div class="flex items-center justify-between mt-8 pt-6 border-t border-ink-200">
              <span class="text-2xs uppercase tracking-widest text-ink-500"
                >{{ (m.page - 1) * m.limit + 1 }}–{{ min(m.page * m.limit, m.total) }} of
                {{ m.total }}</span
              >
              <div class="flex gap-6">
                <button
                  (click)="goToPage(m.page - 1)"
                  [disabled]="m.page === 1"
                  class="text-2xs uppercase tracking-widest hover:text-ink transition-colors disabled:opacity-30"
                >
                  ← Previous
                </button>
                <button
                  (click)="goToPage(m.page + 1)"
                  [disabled]="m.page === m.totalPages"
                  class="text-2xs uppercase tracking-widest hover:text-ink transition-colors disabled:opacity-30"
                >
                  Next →
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

  roleClass(role: string): string {
    if (role === 'super_admin') return 'border-ink bg-ink text-paper';
    if (role === 'admin') return 'border-ink text-ink';
    return 'border-ink-300 text-ink-500';
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
