# ecommerce-store

A Next.js 16 (App Router) storefront scaffold, wired for **Supabase** (database + auth),
**Stripe** (payments), and **Vercel** (deployment). The storefront UI itself is not built
yet — this is the project skeleton and service configuration.

## Stack

| Concern     | Choice                                    |
| ----------- | ----------------------------------------- |
| Framework   | Next.js 16 (App Router) + TypeScript      |
| Styling     | Tailwind CSS v4                            |
| Database    | Supabase (Postgres) via `@supabase/ssr`   |
| Payments    | Stripe (`stripe` + `@stripe/stripe-js`)   |
| Hosting     | Vercel                                     |
| Node        | 22.2.0 (see `.nvmrc`) — matches Vercel     |

## Getting started

```bash
nvm use            # picks up .nvmrc (Node 22.2.0)
npm install
cp .env.example .env.local   # then fill in real values
npm run dev                  # http://localhost:3000
```

> Node 18.18+ is required. The system default here is Node 16, so run `nvm use` first.

## Environment variables

All keys live in `.env.example`. Copy it to `.env.local` for development, and add the
same keys in **Vercel → Project Settings → Environment Variables** for deploys.

| Variable                             | Where to find it                              | Exposed to browser? |
| ------------------------------------ | --------------------------------------------- | ------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`           | Supabase → Settings → API                     | Yes                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Supabase → Settings → API                     | Yes                 |
| `SUPABASE_SERVICE_ROLE_KEY`          | Supabase → Settings → API                     | **No — server only**|
| `STRIPE_SECRET_KEY`                  | Stripe → Developers → API keys                | **No — server only**|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe → Developers → API keys                | Yes                 |
| `STRIPE_WEBHOOK_SECRET`              | `stripe listen` output, or webhook settings   | **No — server only**|
| `NEXT_PUBLIC_SITE_URL`               | Your site's base URL                          | Yes                 |

## Project layout

```
app/
  api/stripe/checkout/route.ts   Creates a Stripe Checkout Session (stub)
  api/stripe/webhook/route.ts    Verifies + handles Stripe webhook events (stub)
lib/
  supabase/client.ts             Browser Supabase client (anon key)
  supabase/server.ts             Server Supabase client + admin (service-role) client
  stripe.ts                      Server-side Stripe SDK
  stripe-client.ts               Browser Stripe.js loader (publishable key)
proxy.ts                         Refreshes the Supabase auth session per request (Next 16 "Proxy")
supabase/schema.sql              Starter tables (products, orders) with RLS
```

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste `supabase/schema.sql`, and run it.
3. Copy the API URL and keys from **Settings → API** into `.env.local`.

## Stripe setup

1. Create an account and grab **test-mode** API keys (Developers → API keys).
2. Test webhooks locally with the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the printed `whsec_…` secret into `STRIPE_WEBHOOK_SECRET`.
3. In production, add `https://your-domain/api/stripe/webhook` as a webhook endpoint
   in the Stripe Dashboard and use that endpoint's signing secret.

## Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import it at [vercel.com/new](https://vercel.com/new) — Next.js is auto-detected.
3. Add every variable from the table above under **Environment Variables**.
4. Deploy. Then set `NEXT_PUBLIC_SITE_URL` to the production URL and add the
   production Stripe webhook endpoint.

## Next steps (building the store)

- [ ] Product listing + detail pages (read from `products`)
- [ ] Cart (client state) and a real `line_items` build in the checkout route
- [ ] Persist orders in the `checkout.session.completed` webhook handler
- [ ] Supabase Auth (sign in / account / order history)
- [ ] Validate all prices server-side — never trust client-sent amounts
