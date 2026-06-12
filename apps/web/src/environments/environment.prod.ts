export const environment = {
  production: true,
  // API calls go through the Vercel domain, which proxies /api/* to Render
  // (see apps/web/vercel.json). Same-origin requests make the guest-cart
  // cookie FIRST-party — Safari/iOS block third-party cookies, so calling
  // Render directly would silently break guest carts there.
  apiUrl: 'https://ecommerce-web-iota-ten.vercel.app/api/v1',
};
