import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { Review, ReviewEligibility, ReviewsService } from '../../../core/services/reviews.service';

@Component({
  selector: 'app-product-reviews',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  template: `
    <section class="border-t border-ink-200 pt-16 mt-16">
      <!-- Header -->
      <div class="flex items-baseline justify-between mb-12">
        <h2 class="text-3xl md:text-4xl font-light tracking-tighter">Reviews</h2>
        @if (total() > 0) {
          <div class="flex items-baseline gap-3 tabular">
            <span class="text-2xl font-light">{{ avg().toFixed(1) }}</span>
            <span class="text-sm text-ink-400">·</span>
            <span class="text-sm text-ink-500">
              {{ total() }} {{ total() === 1 ? 'review' : 'reviews' }}
            </span>
          </div>
        }
      </div>

      <!-- Submit form area -->
      <div class="mb-16">
        @if (!auth.isAuthenticated()) {
          <p class="text-sm text-ink-500">
            <a routerLink="/auth/login" class="link-underline text-ink">Sign in</a>
            to write a review.
          </p>
        } @else if (loadingEligibility()) {
          <div class="h-6 bg-ink-50 animate-pulse w-1/3 rounded"></div>
        } @else if (eligibility()?.existing) {
          <div class="bg-ink-50 px-5 py-4 rounded">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-sm text-ink">Your review</p>
                <div class="mt-1 flex items-center gap-2">
                  <span class="tabular text-sm"
                    >{{ '★'.repeat(eligibility()!.existing!.rating)
                    }}{{ '☆'.repeat(5 - eligibility()!.existing!.rating) }}</span
                  >
                  <span class="text-sm text-ink-500">·</span>
                  <span class="text-sm text-ink-500">{{
                    statusLabel(eligibility()!.existing!.status)
                  }}</span>
                </div>
                @if (eligibility()!.existing!.title) {
                  <p class="text-base mt-2">{{ eligibility()!.existing!.title }}</p>
                }
                @if (eligibility()!.existing!.body) {
                  <p class="text-sm text-ink-500 mt-1">{{ eligibility()!.existing!.body }}</p>
                }
              </div>
              <button
                (click)="deleteOwn()"
                [disabled]="deleting()"
                class="text-sm text-ink-500 hover:text-ink transition-colors link-underline shrink-0"
              >
                {{ deleting() ? 'Removing…' : 'Remove' }}
              </button>
            </div>
          </div>
        } @else if (eligibility()?.canReview) {
          <div>
            <p class="text-sm text-ink mb-5">Write a review</p>
            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5 max-w-2xl">
              <!-- Star rating -->
              <div>
                <label class="label-input">Rating</label>
                <div class="flex items-center gap-1">
                  @for (n of [1, 2, 3, 4, 5]; track n) {
                    <button
                      type="button"
                      (click)="setRating(n)"
                      class="text-2xl leading-none transition-colors"
                      [class.text-ink]="n <= ratingValue()"
                      [class.text-ink-200]="n > ratingValue()"
                      [class.hover:text-ink-500]="n > ratingValue()"
                    >
                      ★
                    </button>
                  }
                  @if (ratingValue() > 0) {
                    <span class="ml-3 text-sm text-ink-500 tabular">{{ ratingValue() }}/5</span>
                  }
                </div>
              </div>

              <div>
                <label class="label-input">Title (optional)</label>
                <input
                  formControlName="title"
                  type="text"
                  placeholder="Sums it up in a phrase"
                  class="input-clean"
                  maxlength="200"
                />
              </div>

              <div>
                <label class="label-input">Your review (optional)</label>
                <textarea
                  formControlName="body"
                  rows="4"
                  placeholder="What did you like, what could be better?"
                  class="input-clean resize-none"
                  maxlength="4000"
                ></textarea>
              </div>

              @if (error()) {
                <p class="text-sm text-ink-500">{{ error() }}</p>
              }

              <div class="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  [disabled]="submitting() || ratingValue() === 0"
                  class="btn-primary"
                >
                  {{ submitting() ? 'Submitting…' : 'Submit review' }}
                </button>
                <p class="text-xs text-ink-400">Reviews are moderated before being published.</p>
              </div>
            </form>
          </div>
        } @else {
          <p class="text-sm text-ink-500">
            Only customers who purchased this product can write a review.
          </p>
        }
      </div>

      <!-- Reviews list -->
      @if (loadingList()) {
        <div class="space-y-8">
          @for (_ of [1, 2, 3]; track $index) {
            <div class="animate-pulse space-y-2 border-t border-ink-200 pt-6">
              <div class="h-3 bg-ink-100 w-1/4"></div>
              <div class="h-4 bg-ink-100 w-1/2"></div>
              <div class="h-3 bg-ink-100 w-3/4"></div>
            </div>
          }
        </div>
      } @else if (reviews().length === 0) {
        <p class="text-sm text-ink-500 border-t border-ink-200 pt-8">
          No reviews yet — be the first.
        </p>
      } @else {
        <div class="border-t border-ink-200">
          @for (r of reviews(); track r.id) {
            <article class="py-8 border-b border-ink-200">
              <div class="flex items-baseline justify-between mb-3">
                <div class="flex items-baseline gap-3">
                  <span class="tabular text-sm"
                    >{{ '★'.repeat(r.rating) }}{{ '☆'.repeat(5 - r.rating) }}</span
                  >
                  <span class="text-sm text-ink">{{ r.authorName }}</span>
                </div>
                <span class="text-sm text-ink-400">{{ r.createdAt | date: 'dd MMM yyyy' }}</span>
              </div>
              @if (r.title) {
                <p class="text-base text-ink mb-1">{{ r.title }}</p>
              }
              @if (r.body) {
                <p class="text-sm text-ink-500 leading-relaxed">{{ r.body }}</p>
              }
            </article>
          }
        </div>
      }
    </section>
  `,
})
export class ProductReviewsComponent {
  readonly productId = input.required<string>();

  readonly auth = inject(AuthService);
  private readonly reviewsService = inject(ReviewsService);
  private readonly fb = inject(FormBuilder);

  readonly reviews = signal<Review[]>([]);
  readonly total = signal(0);
  readonly avg = signal(0);
  readonly loadingList = signal(true);
  readonly loadingEligibility = signal(false);

  readonly eligibility = signal<ReviewEligibility | null>(null);
  readonly submitting = signal(false);
  readonly deleting = signal(false);
  readonly error = signal('');
  readonly ratingValue = signal(0);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.maxLength(200)]],
    body: ['', [Validators.maxLength(4000)]],
  });

  readonly canReview = computed(() => this.eligibility()?.canReview ?? false);

  constructor() {
    effect(() => {
      const id = this.productId();
      if (!id) return;
      this.loadList(id);
      if (this.auth.isAuthenticated()) this.loadEligibility(id);
    });
  }

  setRating(n: number) {
    this.ratingValue.set(n);
  }

  statusLabel(status: string): string {
    if (status === 'approved') return 'Published';
    if (status === 'rejected') return 'Not approved';
    return 'Awaiting approval';
  }

  private loadList(productId: string) {
    this.loadingList.set(true);
    this.reviewsService.list(productId).subscribe({
      next: (res) => {
        this.reviews.set(res.data);
        this.total.set(res.meta.total);
        this.avg.set(res.meta.average);
        this.loadingList.set(false);
      },
      error: () => this.loadingList.set(false),
    });
  }

  private loadEligibility(productId: string) {
    this.loadingEligibility.set(true);
    this.reviewsService.eligibility(productId).subscribe({
      next: (res) => {
        this.eligibility.set(res.data);
        this.loadingEligibility.set(false);
      },
      error: () => {
        this.eligibility.set(null);
        this.loadingEligibility.set(false);
      },
    });
  }

  submit() {
    if (this.ratingValue() === 0) {
      this.error.set('Please select a rating.');
      return;
    }
    this.error.set('');
    this.submitting.set(true);
    const { title, body } = this.form.getRawValue();
    this.reviewsService
      .create({
        productId: this.productId(),
        rating: this.ratingValue(),
        title: title.trim() || undefined,
        body: body.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.form.reset();
          this.ratingValue.set(0);
          // Refresh eligibility to show "your review awaiting approval"
          this.loadEligibility(this.productId());
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err?.error?.error ?? 'Could not submit review.');
        },
      });
  }

  deleteOwn() {
    const reviewId = this.eligibility()?.existing?.id;
    if (!reviewId) return;
    if (!confirm('Remove your review?')) return;
    this.deleting.set(true);
    this.reviewsService.delete(reviewId).subscribe({
      next: () => {
        this.deleting.set(false);
        this.loadEligibility(this.productId());
        this.loadList(this.productId());
      },
      error: () => this.deleting.set(false),
    });
  }
}
