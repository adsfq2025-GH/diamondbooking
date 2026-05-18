# Supabase Migration + Deployment Workflow (Staging + Production)

This repository already supports PostgreSQL via Prisma and works with Supabase by setting `DATABASE_URL` (pooled) and `DIRECT_URL` (direct).

## Goals

- Separate Supabase projects for **staging** and **production**
- Vercel **Preview** deployments use the **staging** Supabase database
- Vercel **Production** deployments use the **production** Supabase database
- Prisma migrations are the single source of truth (`prisma/migrations/*`)

## 0) Preflight (Do this first)

- Confirm your repo does **not** commit `.env` files (this repo ignores them via `.gitignore`)
- Rotate any secrets that have been exposed during debugging:
  - database passwords / connection strings
  - `NEXTAUTH_SECRET` / `AUTH_SECRET`
  - Stripe keys and webhook secrets
  - Resend key
  - Uploadthing secret
  - Twilio auth token

## 1) Create Supabase Projects

Create:
- `diamond-booking-staging`
- `diamond-booking-prod`

For each project, open **Project Settings → Database** and copy:
- **Pooled connection string** → use for `DATABASE_URL`
- **Direct connection string** → use for `DIRECT_URL`

Notes:
- Prisma migrations are more reliable on `DIRECT_URL` (non-pooled).
- App runtime can use pooling (`DATABASE_URL`).

## 2) Prisma Configuration (Already Correct)

Prisma datasource uses both `DATABASE_URL` and `DIRECT_URL`:

- `DATABASE_URL` = app runtime
- `DIRECT_URL` = migrations

See: `prisma/schema.prisma`

## 3) Apply Migrations to Supabase

### Staging (recommended first)

Set environment variables to point to **staging** Supabase, then run:

- `npm run db:deploy`

### Production (after staging is validated)

Set environment variables to point to **production** Supabase, then run:

- `npm run db:deploy`

## 4) Seed Data

Seed is used to create platform config and the initial super admin.

- `npm run db:seed`

If you need demo data in staging only:
- `SEED_DEMO_DATA=true npm run db:seed`

Do not seed demo data in production.

## 5) Vercel Environment Variables

Vercel has environments:
- Preview (PR deploys)
- Production (main deploy)

### Production (uses Supabase prod)

Set in Vercel → Project → Settings → Environment Variables:

- `DATABASE_URL` = Supabase **prod pooled**
- `DIRECT_URL` = Supabase **prod direct**
- `NEXTAUTH_URL` = `https://www.diamond-booking.com`
- `NEXT_PUBLIC_APP_URL` = `https://www.diamond-booking.com`
- `NEXTAUTH_SECRET` (unique strong value)

Stripe (prod):
- `STRIPE_SECRET_KEY` (live)
- `STRIPE_PUBLISHABLE_KEY` (live)
- `STRIPE_WEBHOOK_SECRET` (live)
- `STRIPE_PRICE_*` (live mode price ids)

Email:
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_FROM_NAME`

Uploads:
- `UPLOADTHING_SECRET`
- `UPLOADTHING_APP_ID`

Cron:
- `CRON_SECRET` (and/or `AUTOMATIONS_CRON_SECRET`) if you use Vercel Cron

### Preview (uses Supabase staging)

Preview deployments should point at **staging** Supabase and generally use test-mode integrations:

- `DATABASE_URL` = Supabase **staging pooled**
- `DIRECT_URL` = Supabase **staging direct**
- `NEXTAUTH_URL` = preview deployment origin (or a stable staging domain)
- `NEXT_PUBLIC_APP_URL` = same origin as `NEXTAUTH_URL`
- `NEXTAUTH_SECRET` (separate from prod)

Stripe (preview):
- use Stripe **test** keys + test-mode prices + webhook secret

Important:
- If your Preview URL changes frequently, create a stable staging domain like:
  - `https://staging.diamond-booking.com`
  Then set Preview `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to that stable domain.

## 6) Deploy + Migrations on Vercel

This repo’s production build script runs Prisma migrations when `VERCEL_ENV=production`:
- `scripts/vercel-build.mjs`

So for production deploys:
- Vercel builds → runs `prisma migrate deploy` → runs `next build`

## 7) Stripe Webhook Endpoints

Create separate webhook endpoints in Stripe for:
- **Staging**: `https://<your-staging-domain>/api/billing/webhook` (test mode)
- **Production**: `https://www.diamond-booking.com/api/billing/webhook` (live mode)

Set `STRIPE_WEBHOOK_SECRET` accordingly per Vercel environment.

## 8) Optional: Migrating Data From Another Postgres

If you are moving data from Neon/another Postgres to Supabase:

- Export from source:
  - `pg_dump --no-owner --no-privileges --format=custom --file dump.backup "$SOURCE_DATABASE_URL"`
- Restore into Supabase (direct connection):
  - `pg_restore --no-owner --no-privileges --clean --if-exists --dbname "$SUPABASE_DIRECT_URL" dump.backup`

Then run:
- `npm run db:deploy` (to align Prisma migrations)

## 9) Validation Checklist (Before Monetization)

- Can sign in as owner and reach `/dashboard`
- Can create services/staff, and public booking works for `/book/[slug]`
- Stripe checkout works and webhooks update subscription state
- Staff portal and customer portal login are tenant-scoped and do not allow cross-tenant access
- Automations run once (no duplicate scheduler)

