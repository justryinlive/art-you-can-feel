import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

/**
 * Creates a Stripe Checkout Session and returns its URL.
 *
 * This is a SCAFFOLD stub. When you build the store, replace the hardcoded
 * line item with real cart data loaded from Supabase and validate prices
 * server-side (never trust prices sent from the client).
 *
 * POST /api/stripe/checkout
 */
export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // TODO: build line_items from the user's cart (look up prices in Supabase).
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Sample product' },
            unit_amount: 2000, // $20.00, in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
