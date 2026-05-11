name: ultimate-saas-booking-skill-v5
description: Persistent engineering and architecture standard for Diamond Booking (multi-tenant B2B SaaS booking platform): audit-first, stabilization-first, tenant isolation, secure scalable implementation.

# Ultimate SaaS Booking Skill (v5)

This skill defines the engineering and architecture operating contract for the Diamond Booking platform lifecycle: auditing, debugging, refactoring, scaling, UI/UX generation, and feature completion.

## Activation

Use this skill whenever work involves any of the following: backend/frontend/API development, multi-tenant SaaS systems, booking/onboarding/widget/pricing/memberships/promotions/notifications, Stripe billing, security, performance, deployment, debugging, refactoring, or image-based UI recreation.

If your agent runtime does not support true auto-activation, treat this as a standing instruction: apply these rules to every relevant task by default.

## Mandatory Project-Wide Review Rule

When working on an existing/prebuilt/partially completed project, always complete a codebase audit before generating or modifying code.

Audit scope:
- Project structure and architecture decisions
- Frontend/backend communication patterns
- Database schema, relationships, and tenant partitioning
- AuthN/AuthZ, role permissions, and session shape
- Onboarding flow, booking flow, public widget endpoints
- Pricing engine, promotions, memberships, recurring logic
- Stripe billing flows and webhook processing
- Super Admin features (impersonation, audit log, platform settings)
- Environment variables, deployment and build configuration
- TypeScript safety, validation strategy, error handling
- Background jobs/queues (if present), notifications/automation systems (if present)

Audit outputs:
- System map (modules, data boundaries, trust boundaries)
- Critical issues and tenant leakage risks
- Stabilization plan (fixes ordered by blast radius)
- Backward-compatibility constraints

## Work Contract

For every task:
- Preserve working functionality and backward compatibility unless explicitly instructed otherwise
- Maintain tenant isolation at API, data access, and UI layers
- Prefer small, verifiable changes over rewrites
- Validate inputs on all state-changing routes
- Avoid introducing new libraries unless already present in the codebase or explicitly approved
- Never log secrets, tokens, passwords, raw Stripe payloads, or PII

## Repository Truth (Current Stack)

The current Diamond Booking repository is implemented as:
- Next.js App Router with route handlers under `src/app/api`
- NextAuth v5 (JWT strategy)
- Prisma + PostgreSQL (tenant partitioning by `Business` + `businessId` foreign keys)
- Tailwind CSS + Radix UI primitives under `src/components/ui`
- Stripe subscriptions + webhooks for tenant owner billing

If requirements mention a different stack (for example FastAPI/SQLAlchemy/Celery), do not start a migration or dual-stack architecture without explicit approval. Instead, produce a migration plan and a staged cutover strategy.

## Phase Protocol

### Phase 0: Audit First

Before writing code:
- Identify related modules and call paths
- Confirm tenancy enforcement patterns for the affected route(s)
- Confirm schema constraints, indexes, and invariants
- Identify tests or runtime checks to prove safety

### Phase 1: Stabilize

Fix in priority order:
- Tenant isolation and authorization correctness
- Booking correctness (conflict checks, idempotency, invariants)
- Payment/webhook safety and idempotency
- Input validation and abuse controls (rate limiting)
- Performance bottlenecks that will amplify with scale

### Phase 2: Build

Add features only after stabilization:
- Keep feature work modular and behind stable APIs
- Model rules in the DB and enforce them in code
- Make UI changes without disrupting unrelated systems

## Multi-Tenancy Guardrails (Non-Negotiable)

- Every tenant-scoped query must include `businessId` derived from the authenticated session context unless it is explicitly a Super Admin bypass route.
- Never accept `businessId` from the client for tenant scoping.
- Prefer server-derived scoping utilities (single source of truth) over repeating ad-hoc filters.
- When adding new models, include `businessId`, add supporting indexes, and ensure composite uniqueness where needed.

## Booking Guardrails (Non-Negotiable)

- Prevent double booking with transaction-safe conflict checks and/or DB-level constraints.
- Validate service-staff compatibility and staff ownership for all booking creation paths.
- Normalize user inputs that participate in uniqueness (emails, promo codes).

## Stripe/Billing Guardrails (Non-Negotiable)

- Webhooks must be signature-verified and idempotent.
- Never trust client-provided billing state.
- Store Stripe IDs and statuses with explicit mapping and safe parsing.

## UI/UX Generation Protocol (Including Image-Based Recreation)

When generating or modifying UI:
- Identify the existing UI primitives in `src/components/ui` and reuse them
- Match spacing, typography, and layout patterns already used across dashboard and public booking flows
- Preserve responsiveness and keyboard accessibility
- Limit changes to the smallest surface area needed for the requested UI outcome
- If the user provides screenshots/mockups, recreate layout and hierarchy first, then iterate on spacing and polish

## Project Context

Repository-specific context and stabilization priorities:
- `docs/ultimate-saas-booking-skill-v5/context.md`
