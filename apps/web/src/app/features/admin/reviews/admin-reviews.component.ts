import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminReviewRow, AdminService, PaginatedMeta } from '../../../core/services/admin.service';

const REVIEW_STATUSES = ['pending', 'approved', 'rejected'];

@Component({
  selector: 'app-admin-reviews',
  imports: [DatePipe, TitleCasePipe, FormsModule, RouterLink],
  template: `
    <section class="border-b border-ink-200 bg-paper">
      <div class="px-10 py-12 flex items-end justify-between gap-6">
        <div>
          <h1 class="text-4xl font-light tracking-tighter">Reviews</h1>
          <p class="text-sm text-ink-500 mt-2 tabular">
            @if (meta()) {
              {{ meta()!.total }} {{ meta()!.total === 1 ? 'review' : 'reviews' }}
            }
          </p>
        </div>
        <select
          [(ngModel)]="statusFilter"
          (ngModelChange)="onFilter()"
          class="bg-transparent border-0 border-b border-ink text-sm focus:ring-0 focus:outline-none cursor-pointer pr-8 py-2"
        >
          <option value="">All statuses</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ s | titlecase }}</option>
          }
        </select>
      </div>
    </section>

    <div class="px-10 py-10">
      @if (loading()) {
        <div class="space-y-px">
          @for (_ of [1, 2, 3, 4, 5]; track $index) {
            <div class="h-24 bg-ink-50 animate-pulse rounded"></div>
          }
        </div>
      }

      @if (!loading()) {
        @if (reviews().length === 0) {
          <p class="py-16 text-center text-3xl font-light tracking-tight">No reviews</p>
        } @else {
          <div class="border-t border-ink-200">
            @for (r of reviews(); track r.id) {
              <article class="grid grid-cols-12 gap-6 py-6 border-b border-ink-200">
                <div class="col-span-12 md:col-span-5">
                  <div class="flex items-baseline gap-3 mb-2">
                    <span class="tabular text-sm">{{ stars(r.rating) }}</span>
                    <span class="text-sm text-ink-400">·</span>
                    <span class="text-sm text-ink">{{ r.authorName }}</span>
                  </div>
                  @if (r.title) {
                    <p class="text-base text-ink mb-1">{{ r.title }}</p>
                  }
                  @if (r.body) {
                    <p class="text-sm text-ink-500 leading-relaxed line-clamp-3">{{ r.body }}</p>
                  }
                </div>

                <div class="col-span-6 md:col-span-3">
                  <a
                    [routerLink]="['/products', r.productSlug]"
                    target="_blank"
                    class="text-sm text-ink hover:text-ink-500 transition-colors link-underline"
                  >
                    {{ r.productName }}
                  </a>
                  <p class="text-sm text-ink-400 mt-1">{{ r.authorEmail }}</p>
                </div>

                <div class="col-span-6 md:col-span-2">
                  <p class="text-sm text-ink-500">{{ r.createdAt | date: 'dd MMM yyyy' }}</p>
                  <span class="text-sm mt-1 inline-block" [class]="statusClass(r.status)">{{
                    r.status | titlecase
                  }}</span>
                </div>

                <div
                  class="col-span-12 md:col-span-2 flex md:flex-col items-start gap-3 md:items-end"
                >
                  @if (r.status !== 'approved') {
                    <button
                      (click)="moderate(r, 'approved')"
                      [disabled]="updatingId() === r.id"
                      class="text-sm text-ink hover:text-ink-500 transition-colors link-underline"
                    >
                      Approve
                    </button>
                  }
                  @if (r.status !== 'rejected') {
                    <button
                      (click)="moderate(r, 'rejected')"
                      [disabled]="updatingId() === r.id"
                      class="text-sm text-ink-500 hover:text-ink transition-colors link-underline"
                    >
                      Reject
                    </button>
                  }
                  <button
                    (click)="deleteReview(r)"
                    [disabled]="deletingId() === r.id"
                    class="text-sm text-ink-400 hover:text-ink transition-colors link-underline"
                  >
                    Delete
                  </button>
                </div>
              </article>
            }
          </div>
        }

        @if (meta(); as m) {
          @if (m.totalPages > 1) {
            <div class="flex items-center justify-between mt-8 pt-6 border-t border-ink-200">
              <span class="text-sm text-ink-500 tabular"
                >{{ (m.page - 1) * m.limit + 1 }}–{{ min(m.page * m.limit, m.total) }} of
                {{ m.total }}</span
              >
              <div class="flex gap-6">
                <button
                  (click)="goToPage(m.page - 1)"
                  [disabled]="m.page === 1"
                  class="text-sm text-ink-500 hover:text-ink transition-colors disabled:opacity-30"
                >
                  ← Previous
                </button>
                <button
                  (click)="goToPage(m.page + 1)"
                  [disabled]="m.page === m.totalPages"
                  class="text-sm text-ink-500 hover:text-ink transition-colors disabled:opacity-30"
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
export class AdminReviewsComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  readonly reviews = signal<AdminReviewRow[]>([]);
  readonly meta = signal<PaginatedMeta | null>(null);
  readonly loading = signal(true);
  readonly updatingId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  readonly statuses = REVIEW_STATUSES;
  statusFilter = '';
  currentPage = 1;

  ngOnInit(): void {
    this.load();
  }

  onFilter(): void {
    this.currentPage = 1;
    this.load();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.adminService.getReviews(this.currentPage, 20, this.statusFilter || undefined).subscribe({
      next: (res) => {
        this.reviews.set(res.data);
        this.meta.set(res.meta);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  moderate(review: AdminReviewRow, status: string): void {
    if (review.status === status) return;
    this.updatingId.set(review.id);
    this.adminService.moderateReview(review.id, status).subscribe({
      next: (res) => {
        this.reviews.update((rows) =>
          rows.map((r) =>
            r.id === review.id ? { ...r, status: res.data.status as AdminReviewRow['status'] } : r,
          ),
        );
        this.updatingId.set(null);
      },
      error: () => this.updatingId.set(null),
    });
  }

  deleteReview(review: AdminReviewRow): void {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    this.deletingId.set(review.id);
    this.adminService.deleteReview(review.id).subscribe({
      next: () => {
        this.reviews.update((rows) => rows.filter((r) => r.id !== review.id));
        this.deletingId.set(null);
      },
      error: () => this.deletingId.set(null),
    });
  }

  stars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  statusClass(status: string): string {
    if (status === 'approved') return 'text-ink';
    if (status === 'rejected') return 'text-ink-400';
    return 'text-ink-500';
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
