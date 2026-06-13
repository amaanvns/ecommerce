import { env, clientOrigins } from '../config/env.js';
import { logger } from './logger.js';

const webBase = clientOrigins[0] ?? 'http://localhost:4200';

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

/**
 * Best-effort transactional email via Resend's HTTP API. If RESEND_API_KEY /
 * EMAIL_FROM aren't configured it no-ops (logs and returns) so the app works
 * fully without email set up. Never throws — callers fire-and-forget.
 */
export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    logger.info({ to, subject }, 'Email skipped (RESEND_API_KEY/EMAIL_FROM not configured)');
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
    });
    if (!res.ok) {
      logger.error(
        { to, subject, status: res.status, body: await res.text() },
        'Email send failed',
      );
    }
  } catch (err) {
    logger.error({ err, to, subject }, 'Email send threw');
  }
}

const money = (v: string | number) =>
  `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f4f1;font-family:Helvetica,Arial,sans-serif;color:#0a0a0a">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;letter-spacing:4px;font-size:14px;text-transform:uppercase;padding-bottom:24px">${env.STORE_NAME}</div>
    <div style="background:#fff;border:1px solid #e5e3df;border-radius:10px;padding:28px">
      <h1 style="font-size:22px;font-weight:300;margin:0 0 16px">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#8a8a8a;font-size:12px;padding-top:20px">${env.STORE_NAME} · This is an automated message.</p>
  </div></body></html>`;
}

interface EmailOrder {
  orderNumber: string;
  total: string;
  paymentStatus: string;
  contactEmail: string | null;
  items: { productNameSnapshot: string; qty: number; lineTotal: string }[];
}

export function sendOrderConfirmation(order: EmailOrder, isCod: boolean): void {
  if (!order.contactEmail) return;
  const rows = order.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #efeee9">${i.productNameSnapshot} <span style="color:#8a8a8a">× ${i.qty}</span></td>
         <td style="padding:8px 0;border-bottom:1px solid #efeee9;text-align:right;white-space:nowrap">${money(i.lineTotal)}</td></tr>`,
    )
    .join('');
  const trackUrl = `${webBase}/track-order`;
  const body = `
    <p style="color:#555;line-height:1.6;margin:0 0 16px">Thank you for your order! ${
      isCod
        ? 'You’ll pay in cash when it’s delivered.'
        : 'We’ve received your payment and will get it on its way.'
    }</p>
    <p style="margin:0 0 4px"><strong>Order ${order.orderNumber}</strong></p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">${rows}
      <tr><td style="padding:12px 0 0;font-weight:bold">Total</td>
      <td style="padding:12px 0 0;text-align:right;font-weight:bold">${money(order.total)}</td></tr>
    </table>
    <p style="color:#555;font-size:14px;line-height:1.6">Track your order anytime at
      <a href="${trackUrl}" style="color:#0a0a0a">${trackUrl}</a> using your order number and this email.</p>`;
  void sendEmail({
    to: order.contactEmail,
    subject: `Order confirmed — ${order.orderNumber}`,
    html: layout('Your order is confirmed', body),
  });
}

export function sendOrderShipped(order: {
  orderNumber: string;
  contactEmail: string | null;
}): void {
  if (!order.contactEmail) return;
  const trackUrl = `${webBase}/track-order`;
  const body = `
    <p style="color:#555;line-height:1.6">Good news — your order <strong>${order.orderNumber}</strong> has shipped and is on its way.</p>
    <p style="color:#555;font-size:14px;line-height:1.6">Follow it at <a href="${trackUrl}" style="color:#0a0a0a">${trackUrl}</a>.</p>`;
  void sendEmail({
    to: order.contactEmail,
    subject: `Your order has shipped — ${order.orderNumber}`,
    html: layout('On its way', body),
  });
}
