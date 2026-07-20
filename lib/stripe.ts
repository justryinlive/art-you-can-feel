import Stripe from 'stripe'

/**
 * Server-side Stripe client. SERVER-ONLY — the secret key must never reach the browser.
 * Import this only in Route Handlers, Server Actions, or Server Components.
 *
 * The client is created lazily on first use rather than at module load. Next.js
 * evaluates route-handler modules during the production build (for tracing/
 * page-data collection), when STRIPE_SECRET_KEY is often not present — building
 * the client at import time makes Stripe throw
 * "Neither apiKey nor config.authenticator provided" and fails the deploy.
 * Lazy init means the key is only required when a request actually runs.
 */
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe

  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }

  _stripe = new Stripe(key, {
    // Pin the API version so Stripe upgrades never silently change behavior.
    // Bump this deliberately after reviewing Stripe's changelog.
    apiVersion: '2026-06-24.dahlia',
    typescript: true,
  })
  return _stripe
}
