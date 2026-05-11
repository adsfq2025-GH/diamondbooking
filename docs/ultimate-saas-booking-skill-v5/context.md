# Diamond Booking Context (Skill v5)

## Repository Architecture Map

- App Router pages: `src/app/*`
- API routes: `src/app/api/*`
- Auth: `src/lib/auth.ts`, `src/middleware.ts`, `src/types/next-auth.d.ts`
- DB: `prisma/schema.prisma`, `src/lib/prisma.ts`
- Pricing engine: `src/lib/pricing/engine.ts`
- Availability: `src/lib/availability.ts`
- Industry templates: `src/lib/industry/templates.ts`, `prisma/seed.ts`, `src/app/api/industry/templates/route.ts`
- Public booking flow: `src/app/api/public/*`, `src/components/booking/booking-flow.tsx`, `src/app/book/[slug]/page.tsx`
- Tenant dashboard: `src/app/dashboard/*`, `src/components/dashboard/*`
- Super Admin: `src/app/superadmin/*`, `src/app/api/superadmin/*`, audit helper `src/lib/audit.ts`
- Billing/Stripe: `src/app/api/billing/*`

## Multi-Tenancy Model

- Tenant entity: `Business`
- Tenant partition key: `businessId` on most models (`Service`, `Staff`, `Customer`, `Booking`, `Promotion`, `MembershipPlan`, `CustomerMembership`)
- Enforcement is currently by code convention in route handlers; there is no DB-level isolation (no RLS / separate schemas).

## Highest-Priority Stabilization Targets

1. Booking correctness and anti-double-booking: current public booking flow has a race window where overlapping bookings can slip through.
2. Manual booking correctness: missing staff/service ownership checks, missing conflict checks, and inconsistent email normalization.
3. Abuse controls: add rate limiting to `/api/auth/*` and `/api/public/*`.
4. Promotions enforcement: DB models include constraints (usageLimit, minSubtotal, memberOnly, newCustomerOnly, stackable) that are not consistently enforced in quote/booking logic; promo input normalization is inconsistent.
5. Billing/webhook idempotency: webhook handlers do not record Stripe event IDs to prevent duplicate processing on retries.
6. Role model coherence: middleware allows `ADMIN` access to dashboard, while most APIs require `OWNER`, leading to dead-end UX and/or future auth broadening pressure.

## Known Spec Mismatch

The broader platform objectives reference a FastAPI/Python stack, but this repository currently implements the platform as a Next.js monolith (UI + APIs) with Prisma/Postgres. Treat any migration as an explicit project decision with a staged plan.

## Verification Baseline

- `npm run lint`
- `npm run build`
- `npm run db:generate`
- Critical flows:
  - Owner login → onboarding wizard → create services/staff/hours → public booking page works
  - Promo code quote/booking (case normalization, date window, constraints)
  - Stripe checkout → webhook updates subscription → portal works
  - Super Admin login → businesses list/details → audit export
