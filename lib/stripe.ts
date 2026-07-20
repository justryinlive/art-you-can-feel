import Stripe from 'stripe'

/**
 * Server-side Stripe client. SERVER-ONLY — the secret key must never reach the browser.
 * Import this only in Route Handlers, Server Actions, or Server Components.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Pin the API version so Stripe upgrades never silently change behavior.
  // Bump this deliberately after reviewing Stripe's changelog.
  apiVersion: '2026-06-24.dahlia',
  typescript: true,
})
