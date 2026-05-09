# 💎 Diamond Booking

A production-ready, monetizable B2B SaaS booking platform. Business owners pay a monthly subscription to offer online booking to their clients.

---

## What's Included

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 App Router, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL (Supabase or Neon) |
| Auth | NextAuth v5 (credentials + Google OAuth) |
| Payments | Stripe (subscriptions, webhooks, customer portal) |
| Email | Resend (transactional emails) |
| Storage | Uploadthing (logos, images) |
| Deployment | Vercel |

---

## Quick Start (Local Dev)

### 1. Clone and install

```bash
git clone <your-repo>
cd diamond-booking
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in every value in `.env`. See the section below for where to get each one.

### 3. Set up the database

Create a free PostgreSQL database at [supabase.com](https://supabase.com) or [neon.tech](https://neon.tech).

```bash
# Push schema to your database
npx prisma db push

# Seed: creates Super Admin + subscription plans
npx prisma db seed

# Optional: seed 3 demo businesses so the admin dashboard has data
SEED_DEMO_DATA=true npx prisma db seed
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

```env
# ── Database ──────────────────────────────────────────────────────────
DATABASE_URL="postgresql://user:pass@host:5432/diamond_booking?sslmode=require"
# For Supabase, also add:
# DIRECT_URL="postgresql://user:pass@host:5432/diamond_booking"

# ── Auth ──────────────────────────────────────────────────────────────
NEXTAUTH_SECRET="generate-32-chars: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"   # Change to your domain in production

# ── Super Admin ────────────────────────────────────────────────────────
# Created by seed script. NEVER commit these to git.
SUPER_ADMIN_EMAIL="admin@yourdomain.com"
SUPER_ADMIN_PASSWORD="use-a-strong-password"

# ── Stripe ────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."     # From Stripe Dashboard > Webhooks

# Stripe Price IDs — create these in Stripe Dashboard first
STRIPE_PRICE_STARTER_MONTHLY="price_..."
STRIPE_PRICE_STARTER_YEARLY="price_..."
STRIPE_PRICE_PRO_MONTHLY="price_..."
STRIPE_PRICE_PRO_YEARLY="price_..."
STRIPE_PRICE_ENTERPRISE_MONTHLY="price_..."
STRIPE_PRICE_ENTERPRISE_YEARLY="price_..."

# ── Email (Resend) ────────────────────────────────────────────────────
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@yourdomain.com"
RESEND_FROM_NAME="Diamond Booking"

# ── Google OAuth ──────────────────────────────────────────────────────
# Get from console.cloud.google.com > APIs > Credentials
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# ── Uploadthing ───────────────────────────────────────────────────────
UPLOADTHING_SECRET="sk_live_..."
UPLOADTHING_APP_ID="..."

# ── App ───────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="Diamond Booking"
```

---

## Stripe Setup

### 1. Create Products & Prices

In your [Stripe Dashboard](https://dashboard.stripe.com/products):

Create 4 products: **Starter**, **Professional**, **Enterprise**, **Free**

For each paid plan, create two prices: Monthly (recurring/month) and Yearly (recurring/year).

Copy each price ID into your `.env` file.

### 2. Configure Webhooks

In [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks), add an endpoint:

- **URL:** `https://yourdomain.com/api/billing/webhook`
- **Events to listen for:**
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### 3. Test locally with Stripe CLI

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
# Then test with:
stripe trigger checkout.session.completed
```

---

## Deploying to Vercel

```bash
npm install -g vercel
vercel --prod
```

Or connect your GitHub repo in the Vercel dashboard.

**After deploying:**

1. Set all environment variables in Vercel > Project > Settings > Environment Variables
2. Update `NEXTAUTH_URL` to your production domain
3. Update `NEXT_PUBLIC_APP_URL` to your production domain
4. Update Stripe webhook URL to your production domain
5. Run the seed: `vercel run npx prisma db seed`

---

## Route Structure

```
/                           → Landing page (marketing)
/login                      → Single login page for all roles
/register                   → New business owner signup
/forgot-password            → Password reset request
/onboarding                 → 7-step business setup wizard (new accounts)

/dashboard                  → Business owner dashboard
/dashboard/calendar         → Calendar view
/dashboard/bookings         → Bookings table
/dashboard/services         → Services CRUD
/dashboard/staff            → Staff management
/dashboard/clients          → Client database
/dashboard/settings         → Business settings + hours
/dashboard/billing          → Subscription + usage

/superadmin                 → Super Admin overview
/superadmin/businesses      → All businesses
/superadmin/users           → All users
/superadmin/subscriptions   → Revenue & subscriptions
/superadmin/bookings        → All platform bookings
/superadmin/emails          → Broadcast emails
/superadmin/audit-log       → Immutable audit trail
/superadmin/settings        → Platform settings + maintenance mode
/superadmin/system          → System health checks

/book/[slug]                → Public booking page (no login required)

/api/auth/*                 → NextAuth + register + forgot-password
/api/business/*             → Business CRUD + hours + onboarding
/api/services/*             → Services CRUD
/api/staff/*                → Staff CRUD
/api/bookings/*             → Bookings CRUD + status updates
/api/billing/*              → Stripe checkout, portal, webhooks
/api/public/*               → Public booking flow (no auth)
/api/superadmin/*           → Super Admin APIs (role-gated)
```

---

## Subscription Plans

| Plan | Price | Staff | Services | Bookings/mo | Features |
|---|---|---|---|---|---|
| Free | $0 | 1 | 3 | 20 | Basic booking page |
| Starter | $29/mo | 3 | 10 | 100 | Remove branding |
| Professional | $59/mo | 10 | ∞ | ∞ | Email reminders, analytics |
| Enterprise | $119/mo | ∞ | ∞ | ∞ | Custom domain, API access |

Annual plans = 2 months free.

---

## Super Admin

After seeding, log in with your `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD`. You'll be redirected to `/superadmin` automatically.

From the Super Admin dashboard you can:
- View all businesses, users, and subscriptions
- Suspend or delete any business
- Override subscription plans
- Send broadcast emails
- Toggle platform maintenance mode
- View the immutable audit log
- Monitor system health (DB, Stripe, email)

---

## Key Architecture Decisions

**Multi-tenancy:** Every database query in business-owner routes includes `businessId = currentUser.businessId`. The middleware + route handlers enforce this. Super Admin routes bypass this filter intentionally.

**Availability algorithm:** `src/lib/availability.ts` generates time slots by: (1) getting business/staff hours for the day, (2) loading existing bookings, (3) walking through the day in `slotIncrementMinutes` steps, (4) filtering out conflicts including buffer time and minimum notice.

**Audit log:** Append-only. No update or delete operations exist on the `AuditLog` model. Every destructive Super Admin action writes a record.

**Plan enforcement:** `src/lib/plan-limits.ts` checks limits before every `POST /api/services`, `POST /api/staff`, and `POST /api/bookings`. The check hits the DB for live plan config, not hardcoded values.

---

## Customization

**Brand colors:** All theme tokens are in `src/app/globals.css` as CSS variables. Change `--primary` and `--accent` to rebrand.

**Email templates:** All templates are in `src/lib/email.ts` as inline HTML strings. Replace with React Email components for more complex designs.

**Pricing:** Change plan prices in the `PlanConfig` table (set in seed script) and in your Stripe Dashboard. The app reads limits from the DB.

**Domain:** Update `NEXT_PUBLIC_APP_URL` everywhere and the booking page URL in the onboarding wizard.

---

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run db:push      # Push Prisma schema to DB (no migration history)
npm run db:migrate   # Create and apply migration
npm run db:seed      # Seed Super Admin + plans
npm run db:studio    # Open Prisma Studio (DB GUI)
npm run db:generate  # Regenerate Prisma client after schema changes
```

---

## Revenue Projections

At the plan prices above:

| Subscribers | Monthly Revenue |
|---|---|
| 50 Starter | $1,450/mo |
| 50 Professional | $2,950/mo |
| 10 Enterprise | $1,190/mo |
| **100 total mix** | **~$5,590/mo** |

With Stripe's ~2.9% + $0.30 per transaction, net margins on subscriptions are ~97%.

---

## License

Built for your use. Customize, rebrand, and sell subscriptions freely.
#   d i a m o n d . b o o k i n g  
 