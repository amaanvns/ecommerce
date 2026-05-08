import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoOptions {
  title?: string;
  description?: string;
  url?: string; // canonical, absolute or path
  image?: string; // absolute URL
  type?: 'website' | 'article' | 'product';
  siteName?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  noindex?: boolean;
}

const DEFAULT_TITLE = 'Shopzone — Considered objects, made well';
const DEFAULT_DESCRIPTION =
  'A small, slow edit of pieces designed to be lived with, mended, and passed on.';
const DEFAULT_SITE_NAME = 'Shopzone';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly platformId = inject(PLATFORM_ID);

  constructor(@Inject(DOCUMENT) private doc: Document) {}

  apply(opts: SeoOptions): void {
    const title = opts.title ? `${opts.title} — Shopzone` : DEFAULT_TITLE;
    const description = opts.description ?? DEFAULT_DESCRIPTION;
    const siteName = opts.siteName ?? DEFAULT_SITE_NAME;
    const type = opts.type ?? 'website';
    const url = this.absoluteUrl(opts.url);

    this.title.setTitle(title);

    // Standard
    this.upsertMetaName('description', description);
    if (opts.noindex) {
      this.upsertMetaName('robots', 'noindex,nofollow');
    } else {
      this.removeMeta('name="robots"');
    }

    // Open Graph
    this.upsertMetaProperty('og:title', title);
    this.upsertMetaProperty('og:description', description);
    this.upsertMetaProperty('og:type', type);
    this.upsertMetaProperty('og:site_name', siteName);
    if (url) this.upsertMetaProperty('og:url', url);
    if (opts.image) this.upsertMetaProperty('og:image', opts.image);

    // Twitter
    this.upsertMetaName(
      'twitter:card',
      opts.twitterCard ?? (opts.image ? 'summary_large_image' : 'summary'),
    );
    this.upsertMetaName('twitter:title', title);
    this.upsertMetaName('twitter:description', description);
    if (opts.image) this.upsertMetaName('twitter:image', opts.image);

    // Canonical
    if (url) this.setCanonical(url);
  }

  /**
   * Replace the current page's JSON-LD <script> tags. Pass an array of structured-data
   * objects (e.g. Product, BreadcrumbList, AggregateRating) — they'll be merged into one
   * @graph entry to keep the head tidy.
   */
  setJsonLd(graph: Record<string, unknown>[]): void {
    // Remove any existing JSON-LD tags we previously inserted
    const existing = this.doc.querySelectorAll(
      'script[type="application/ld+json"][data-seo="true"]',
    );
    existing.forEach((el) => el.remove());

    if (graph.length === 0) return;

    const script = this.doc.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-seo', 'true');
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
    this.doc.head.appendChild(script);
  }

  reset(): void {
    this.apply({});
    this.setJsonLd([]);
  }

  private upsertMetaProperty(property: string, content: string): void {
    if (this.meta.getTag(`property="${property}"`)) {
      this.meta.updateTag({ property, content });
    } else {
      this.meta.addTag({ property, content });
    }
  }

  private upsertMetaName(name: string, content: string): void {
    if (this.meta.getTag(`name="${name}"`)) {
      this.meta.updateTag({ name, content });
    } else {
      this.meta.addTag({ name, content });
    }
  }

  private removeMeta(selector: string): void {
    this.meta.removeTag(selector);
  }

  private setCanonical(url: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.rel = 'canonical';
      this.doc.head.appendChild(link);
    }
    link.href = url;
  }

  private absoluteUrl(input?: string): string | undefined {
    if (!input) return undefined;
    if (/^https?:\/\//i.test(input)) return input;
    if (isPlatformBrowser(this.platformId)) {
      return new URL(input, this.doc.location.origin).toString();
    }
    // SSR: trust input as-is or fall back to relative
    return input;
  }
}
