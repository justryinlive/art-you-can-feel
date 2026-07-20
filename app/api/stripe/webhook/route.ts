import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Stripe webhook handler. Stripe calls this endpoint to notify us of events
 * (payment succeeded, refunded, etc.). We verify the signature so we only
 * trust events that genuinely came from Stripe.
 *
 * Local testing:  stripe listen --forward-to localhost:3000/api/stripe/webhook
 * Production:     add this URL as a webhook endpoint in the Stripe Dashboard
 *                 and copy the signing secret into STRIPE_WEBHOOK_SECRET.
 *
 * POST /api/stripe/webhook
 */
export async function POST(req: NextRequest) {
  const body = await req.text() // raw body is required for signature verification
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Use the admin client (bypasses RLS) to record verified order state.
  const supabase = createAdminClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      // TODO: mark the order paid / create it in Supabase, decrement stock, etc.
      console.log('Payment complete for session:', session.id)
      void supabase // wired up and ready — remove this line once you use it
      break
    }
    default:
      // Unhandled event types are fine — just acknowledge them.
      break
  }

  return NextResponse.json({ received: true })
}
