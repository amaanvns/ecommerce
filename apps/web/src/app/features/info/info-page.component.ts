import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

/**
 * ── EDIT YOUR STORE DETAILS HERE ──────────────────────────────────────────
 * These values drive every policy/info page below. Update them with your real
 * contact info, timelines, and return window.
 */
export const STORE = {
  name: 'Star Enterprises',
  email: 'support@starenterprises.in',
  phone: '+91 98765 43210',
  address: 'Star Enterprises, [Street], [City], [State] — [PIN], India',
  returnDays: 7,
  shipDaysMin: 3,
  shipDaysMax: 7,
  freeShippingOver: 2500,
};

type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; text: string }
  | { t: 'li'; items: string[] }
  | { t: 'contact' };

interface InfoPage {
  title: string;
  intro?: string;
  blocks: Block[];
}

const PAGES: Record<string, InfoPage> = {
  shipping: {
    title: 'Shipping Policy',
    intro: 'How and when your order reaches you.',
    blocks: [
      { t: 'h', text: 'Dispatch & delivery time' },
      {
        t: 'p',
        text: `Orders are processed within 1–2 business days. Delivery typically takes ${STORE.shipDaysMin}–${STORE.shipDaysMax} business days depending on your location, with metro cities on the faster end.`,
      },
      { t: 'h', text: 'Shipping charges' },
      {
        t: 'p',
        text: `Shipping is free on all orders above ₹${STORE.freeShippingOver.toLocaleString('en-IN')}. A nominal fee may apply on smaller orders and is shown at checkout.`,
      },
      { t: 'h', text: 'Tracking your order' },
      {
        t: 'p',
        text: 'Once your order ships you can follow its status from “Track Order” in the footer (order number + email), or from “My Orders” if you have an account.',
      },
      { t: 'h', text: 'Delays' },
      {
        t: 'p',
        text: 'Deliveries may take longer during festive periods, sales, or due to courier or weather disruptions beyond our control. We appreciate your patience.',
      },
    ],
  },
  returns: {
    title: 'Returns & Refunds',
    intro: 'We want you to love what you receive.',
    blocks: [
      { t: 'h', text: `${STORE.returnDays}-day returns` },
      {
        t: 'p',
        text: `You may request a return within ${STORE.returnDays} days of delivery. Items must be unworn, unwashed, and returned with original tags and packaging intact.`,
      },
      { t: 'h', text: 'How to return' },
      {
        t: 'p',
        text: `Email us at ${STORE.email} with your order number and the item(s) you’d like to return, and we’ll guide you through the pickup or drop-off.`,
      },
      { t: 'h', text: 'Refunds' },
      {
        t: 'p',
        text: 'Once we receive and inspect the returned item, your refund is processed to the original payment method within 5–7 business days. For Cash on Delivery orders, refunds are made to a bank account you provide.',
      },
      { t: 'h', text: 'Non-returnable items' },
      {
        t: 'li',
        items: [
          'Items marked “final sale” or “non-returnable” on the product page',
          'Stitched/customised pieces made to your measurements',
          'Items damaged through wear or improper care',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'What we collect and how we use it.',
    blocks: [
      { t: 'h', text: 'Information we collect' },
      {
        t: 'p',
        text: 'We collect the details you provide to place and deliver orders — name, email, phone, and shipping address — plus basic usage data to keep the site working and improve it.',
      },
      { t: 'h', text: 'How we use it' },
      {
        t: 'li',
        items: [
          'To process, deliver, and support your orders',
          'To send order confirmations and shipping updates',
          'To prevent fraud and keep the store secure',
        ],
      },
      { t: 'h', text: 'Payments' },
      {
        t: 'p',
        text: 'Payments are handled by our payment gateway (Razorpay). We never see or store your full card details.',
      },
      { t: 'h', text: 'Your choices' },
      {
        t: 'p',
        text: `You can request access to or deletion of your personal data at any time by writing to ${STORE.email}. We do not sell your personal information.`,
      },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    intro: 'The basics of using this store.',
    blocks: [
      { t: 'h', text: 'Orders' },
      {
        t: 'p',
        text: 'Placing an order is an offer to buy. We may decline or cancel an order — for example, if an item is out of stock or a pricing error occurred — and will refund any amount already paid.',
      },
      { t: 'h', text: 'Pricing' },
      {
        t: 'p',
        text: 'All prices are in Indian Rupees (₹) and include applicable taxes unless stated otherwise. We try to keep prices and product details accurate but errors may occasionally occur.',
      },
      { t: 'h', text: 'Use of the site' },
      {
        t: 'p',
        text: 'You agree not to misuse the site, attempt to disrupt it, or use it for any unlawful purpose. Product images and content are owned by us and may not be reused without permission.',
      },
      { t: 'h', text: 'Contact' },
      {
        t: 'p',
        text: `Questions about these terms? Reach us at ${STORE.email}.`,
      },
    ],
  },
  faq: {
    title: 'Frequently Asked Questions',
    blocks: [
      { t: 'h', text: 'How long will delivery take?' },
      {
        t: 'p',
        text: `Most orders arrive in ${STORE.shipDaysMin}–${STORE.shipDaysMax} business days after dispatch. You’ll get a confirmation when your order is placed and again when it ships.`,
      },
      { t: 'h', text: 'Do you offer Cash on Delivery?' },
      {
        t: 'p',
        text: 'Yes, on eligible products. If every item in your bag supports COD, you’ll see the option at checkout.',
      },
      { t: 'h', text: 'Can I order without creating an account?' },
      {
        t: 'p',
        text: 'Absolutely. You can check out as a guest with just your email, and track the order anytime from “Track Order”. You can also create an account later and your past orders will link automatically.',
      },
      { t: 'h', text: 'How do returns work?' },
      {
        t: 'p',
        text: `You can request a return within ${STORE.returnDays} days of delivery. See our Returns & Refunds page for details.`,
      },
      { t: 'h', text: 'What if my size doesn’t fit?' },
      {
        t: 'p',
        text: 'Check the size guide on each product page before ordering. If it still doesn’t fit, you can return it within the return window.',
      },
    ],
  },
  about: {
    title: 'About Us',
    intro: 'Considered Indian wear, made to be lived in.',
    blocks: [
      {
        t: 'p',
        text: `${STORE.name} is a small, slow edit of Indian ethnic wear — kurtas, sarees, lehengas, sherwanis and the pieces that finish them. We work with makers in small runs and choose fabrics meant to last and be passed on.`,
      },
      {
        t: 'p',
        text: 'We’d rather sell you one piece you keep for years than ten you forget. Everything we list is something we’d wear ourselves.',
      },
      { t: 'h', text: 'Get in touch' },
      { t: 'contact' },
    ],
  },
  contact: {
    title: 'Contact Us',
    intro: 'We’re happy to help with sizing, orders, or returns.',
    blocks: [{ t: 'contact' }, { t: 'p', text: 'We usually reply within one business day.' }],
  },
};

@Component({
  selector: 'app-info-page',
  imports: [RouterLink],
  template: `
    @if (page(); as p) {
      <section class="container-edge pt-20 pb-10 lg:pt-28 max-w-3xl">
        <a routerLink="/" class="text-sm text-ink-500 hover:text-ink link-underline">← Home</a>
        <h1 class="mt-4 text-4xl md:text-5xl font-light tracking-tighter">{{ p.title }}</h1>
        @if (p.intro) {
          <p class="mt-4 text-lg text-ink-500">{{ p.intro }}</p>
        }
      </section>

      <section class="container-edge pb-24 max-w-3xl space-y-1">
        @for (block of p.blocks; track $index) {
          @switch (block.t) {
            @case ('h') {
              <h2 class="text-xl font-light tracking-tight text-ink pt-7">{{ block.text }}</h2>
            }
            @case ('p') {
              <p class="text-ink-500 leading-relaxed">{{ block.text }}</p>
            }
            @case ('li') {
              <ul class="list-disc pl-5 space-y-1 text-ink-500 leading-relaxed">
                @for (item of block.items; track item) {
                  <li>{{ item }}</li>
                }
              </ul>
            }
            @case ('contact') {
              <div class="mt-2 space-y-2 text-ink">
                <p>
                  <span class="text-ink-400 text-sm uppercase tracking-widest mr-3">Email</span>
                  <a class="link-underline" [href]="'mailto:' + store.email">{{ store.email }}</a>
                </p>
                <p>
                  <span class="text-ink-400 text-sm uppercase tracking-widest mr-3">Phone</span>
                  <a class="link-underline" [href]="'tel:' + store.phone">{{ store.phone }}</a>
                </p>
                <p class="text-ink-500">{{ store.address }}</p>
              </div>
            }
          }
        }

        <p class="pt-10 text-xs text-ink-400">Last updated June 2026</p>
      </section>
    } @else {
      <section class="container-edge py-32 text-center">
        <p class="text-3xl font-light tracking-tight">Page not found</p>
        <a routerLink="/" class="btn-outline mt-8 inline-block">Go home</a>
      </section>
    }
  `,
})
export class InfoPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  readonly store = STORE;

  readonly page = computed(() => {
    const key = this.route.snapshot.data['page'] as string | undefined;
    const p = key ? PAGES[key] : undefined;
    if (p) {
      this.seo.apply({
        title: `${p.title} — ${STORE.name}`,
        description: p.intro ?? p.title,
        url: `/${key}`,
        type: 'website',
      });
    }
    return p;
  });
}
