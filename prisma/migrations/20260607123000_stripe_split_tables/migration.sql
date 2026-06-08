CREATE TABLE "stripe_customers" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL,
  "livemode" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stripe_customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stripe_customers_userId_key" ON "stripe_customers"("userId");
CREATE UNIQUE INDEX "stripe_customers_stripeCustomerId_key" ON "stripe_customers"("stripeCustomerId");
CREATE INDEX "stripe_customers_stripeCustomerId_idx" ON "stripe_customers"("stripeCustomerId");

ALTER TABLE "stripe_customers"
ADD CONSTRAINT "stripe_customers_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "billing_history" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "stripeInvoiceId" TEXT NOT NULL,
  "stripeSubscriptionId" TEXT,
  "stripeCustomerId" TEXT,
  "amountPaid" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_history_stripeInvoiceId_key" ON "billing_history"("stripeInvoiceId");
CREATE INDEX "billing_history_userId_idx" ON "billing_history"("userId");
CREATE INDEX "billing_history_stripeSubscriptionId_idx" ON "billing_history"("stripeSubscriptionId");

ALTER TABLE "billing_history"
ADD CONSTRAINT "billing_history_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_history"
ADD CONSTRAINT "billing_history_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "stripe_connect_accounts" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "stripeAccountId" TEXT NOT NULL,
  "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "stripe_connect_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stripe_connect_accounts_businessId_key" ON "stripe_connect_accounts"("businessId");
CREATE UNIQUE INDEX "stripe_connect_accounts_stripeAccountId_key" ON "stripe_connect_accounts"("stripeAccountId");
CREATE INDEX "stripe_connect_accounts_stripeAccountId_idx" ON "stripe_connect_accounts"("stripeAccountId");

ALTER TABLE "stripe_connect_accounts"
ADD CONSTRAINT "stripe_connect_accounts_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "booking_payments" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "stripePaymentIntentId" TEXT,
  "stripeCheckoutSessionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "booking_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "booking_payments_stripePaymentIntentId_key" ON "booking_payments"("stripePaymentIntentId");
CREATE UNIQUE INDEX "booking_payments_stripeCheckoutSessionId_key" ON "booking_payments"("stripeCheckoutSessionId");
CREATE INDEX "booking_payments_bookingId_idx" ON "booking_payments"("bookingId");

ALTER TABLE "booking_payments"
ADD CONSTRAINT "booking_payments_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "payout_history" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "stripePayoutId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "status" TEXT NOT NULL,
  "arrivalDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payout_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payout_history_stripePayoutId_key" ON "payout_history"("stripePayoutId");
CREATE INDEX "payout_history_businessId_idx" ON "payout_history"("businessId");

ALTER TABLE "payout_history"
ADD CONSTRAINT "payout_history_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

