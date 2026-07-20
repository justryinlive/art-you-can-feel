import { loadStripe, type Stripe } from '@stripe/stripe-js'

/**
 * Browser-side Stripe.js loader, memoized so we only fetch the script once.
 * Uses the publishable key (safe to expose). Useful for Stripe Elements or
 * redirecting to Checkout from a Client Component.
 */
let stripePromise: Promise<Stripe | null>

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
    )
  }
  return stripePromise
}
