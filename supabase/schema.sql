-- ---------------------------------------------------------------------------
-- Starter schema for the ecommerce store.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query),
-- or via the Supabase CLI: `supabase db push`.
--
-- This is a minimal scaffold — extend it as you build out the store.
-- Row Level Security (RLS) is ON for every table. Add policies before exposing
-- data to the browser via the anon key, or reads/writes will be denied.
-- ---------------------------------------------------------------------------

-- Products ------------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  -- Store money as integer cents to avoid floating-point rounding errors.
  price_cents integer not null check (price_cents >= 0),
  currency    text not null default 'usd',
  image_url   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.products enable row level security;

-- Anyone may read active products (public storefront).
create policy "Active products are viewable by everyone"
  on public.products for select
  using (active = true);

-- Orders --------------------------------------------------------------------
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users (id),
  stripe_session_id   text unique,
  status              text not null default 'pending', -- pending | paid | fulfilled | cancelled
  amount_total_cents  integer,
  currency            text default 'usd',
  created_at          timestamptz not null default now()
);

alter table public.orders enable row level security;

-- A signed-in user may read only their own orders.
create policy "Users can view their own orders"
  on public.orders for select
  using (auth.uid() = user_id);
-- Note: orders are created/updated server-side by the Stripe webhook using the
-- service role key, which bypasses RLS — so no insert/update policy is needed here.
