ALTER TABLE "stripe_webhook_events"
ADD COLUMN "payload" JSONB,
ADD COLUMN "processed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "processedAt" TIMESTAMP(3),
ADD COLUMN "errorMessage" TEXT;

