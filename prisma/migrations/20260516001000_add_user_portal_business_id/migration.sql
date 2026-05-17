ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "portalBusinessId" TEXT;

DO $$ BEGIN
  ALTER TABLE "users"
    ADD CONSTRAINT "users_portalBusinessId_fkey"
    FOREIGN KEY ("portalBusinessId") REFERENCES "businesses"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "users_portalBusinessId_idx" ON "users"("portalBusinessId");

