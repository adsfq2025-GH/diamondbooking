-- CreateTable
CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "livemode" BOOLEAN NOT NULL,
    "stripeCreated" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stripe_webhook_events_stripeEventId_key" ON "stripe_webhook_events"("stripeEventId");

-- CreateIndex
CREATE INDEX "stripe_webhook_events_type_idx" ON "stripe_webhook_events"("type");
