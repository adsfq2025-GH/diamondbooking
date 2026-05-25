[OPEN] Debug Session: business-create-failed

## Symptom
- Onboarding Step 1 shows: "Failed to create business"

## Expected
- Business should be created successfully and onboarding should proceed to next step.

## Hypotheses (falsifiable)
- A: Auth/session is missing or role is not OWNER/ADMIN, causing server-side rejection.
- B: Request payload validation fails (missing/invalid fields like name/industry/plan), returning 400/500.
- C: Prisma create/update fails due to DB constraint (slug unique, required fields, connect fields, etc.).
- D: Environment variables required by onboarding/business creation are missing in production (e.g., STRIPE plan IDs), causing server error.
- E: Middleware/redirect affects API call or callback origin, causing unexpected behavior or wrong tenant context.

## Evidence to Collect
- API: /api/business/onboard request body + derived slug + selected plan.
- API: session user role/email/id and authorization outcome.
- API: Prisma errors (code, meta) if thrown.
- Client: response status + response JSON for failed create.

## Runs
- pre-fix: pending
- post-fix: pending

