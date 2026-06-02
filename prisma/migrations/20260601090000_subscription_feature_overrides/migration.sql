ALTER TABLE "subscriptions"
ADD COLUMN "featureOverrides" JSONB NOT NULL DEFAULT '{}';
