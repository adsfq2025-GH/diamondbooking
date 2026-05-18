-- AlterTable
ALTER TABLE "scheduled_notifications" ADD COLUMN "dedupeKey" TEXT NOT NULL DEFAULT 'default';

-- DropIndex
DROP INDEX "scheduled_notifications_bookingId_type_channel_key";

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_notifications_bookingId_type_channel_dedupeKey_key" ON "scheduled_notifications"("bookingId", "type", "channel", "dedupeKey");

