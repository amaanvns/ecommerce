import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen grid lg:grid-cols-2 bg-paper">
      <!-- Image side -->
      <div
        class="relative hidden lg:block bg-cover bg-center"
        style="background-image: url('https://loremflickr.com/1400/1800/saree,indian,textile?lock=67')"
      >
        <div class="absolute inset-0 bg-ink/20"></div>
        <div class="relative h-full flex flex-col justify-between p-12 text-paper">
          <a routerLink="/" class="text-base tracking-[0.22em] uppercase font-medium"
            >Star Enterprises</a
          >
          <div class="max-w-md">
            <h2 class="text-4xl xl:text-5xl font-light leading-[1.1] tracking-tight text-balance">
              Considered objects, made to outlive trends.
            </h2>
            <p class="mt-6 text-paper/80 max-w-sm leading-relaxed">
              Buy less, choose well, make it last.
            </p>
          </div>
        </div>
      </div>

      <!-- Form side -->
      <div class="flex flex-col">
        <div class="flex justify-between items-center px-8 lg:px-12 py-6">
          <a
            routerLink="/"
            class="lg:hidden text-xs sm:text-sm tracking-[0.12em] uppercase font-medium"
            >Star Enterprises</a
          >
          <a
            routerLink="/"
            class="ml-auto text-sm text-ink-500 hover:text-ink transition-colors link-underline"
          >
            ← Home
          </a>
        </div>
        <div class="flex-1 flex items-center justify-center px-8 lg:px-12 py-8">
          <div class="w-full max-w-md">
            <router-outlet />
          </div>
        </div>
        <p class="text-center text-sm text-ink-400 px-8 py-6">&copy; {{ year }} Star Enterprises</p>
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {
  readonly year = new Date().getFullYear();
}
