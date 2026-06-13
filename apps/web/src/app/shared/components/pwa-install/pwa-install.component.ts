import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwaInstallDismissed';

/**
 * "Add to Home Screen" prompt. Chromium browsers fire `beforeinstallprompt`
 * when the PWA is installable; we capture it and show a small banner. iOS Safari
 * doesn't support programmatic install, so the banner simply never appears there.
 */
@Component({
  selector: 'app-pwa-install',
  template: `
    @if (visible()) {
      <div
        class="fixed bottom-4 inset-x-4 z-40 sm:left-auto sm:right-4 sm:max-w-sm bg-ink text-paper rounded-lg shadow-lg p-4 flex items-center gap-4 animate-fade-in"
      >
        <div class="flex-1 text-sm">
          <p class="font-medium">Install Star Enterprises</p>
          <p class="text-paper/70 mt-0.5">Add the app to your home screen for faster shopping.</p>
        </div>
        <button
          (click)="install()"
          class="shrink-0 bg-paper text-ink text-sm px-4 py-2 rounded-full hover:opacity-90 transition-opacity"
        >
          Install
        </button>
        <button
          (click)="dismiss()"
          class="shrink-0 text-paper/60 hover:text-paper text-xl leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    }
  `,
})
export class PwaInstallComponent implements OnInit {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private deferred: BeforeInstallPromptEvent | null = null;
  readonly visible = signal(false);

  ngOnInit(): void {
    if (!this.isBrowser) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      // ignore
    }
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferred = e as BeforeInstallPromptEvent;
      this.visible.set(true);
    });
  }

  async install(): Promise<void> {
    if (!this.deferred) return;
    await this.deferred.prompt();
    await this.deferred.userChoice;
    this.deferred = null;
    this.visible.set(false);
  }

  dismiss(): void {
    this.visible.set(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  }
}
