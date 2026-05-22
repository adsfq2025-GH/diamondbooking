-- CreateEnum
CREATE TYPE "ServiceBillingUnit" AS ENUM ('PER_JOB', 'PER_HOUR');

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "billingUnit" "ServiceBillingUnit" NOT NULL DEFAULT 'PER_JOB',
ADD COLUMN     "minDurationMinutes" INTEGER;
