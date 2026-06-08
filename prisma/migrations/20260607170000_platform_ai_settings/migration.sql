ALTER TABLE "platform_settings"
ADD COLUMN     "aiEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiProvider" TEXT NOT NULL DEFAULT 'openrouter',
ADD COLUMN     "aiModel" TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
ADD COLUMN     "aiAllowAiAssisted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "aiAllowHybrid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "aiWebsiteFetchEnabled" BOOLEAN NOT NULL DEFAULT true;
