-- AlterTable
ALTER TABLE "DiscoveryRun" ADD COLUMN     "retryAfter" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "SourcePolicy" ADD COLUMN     "nextFetchAt" TIMESTAMPTZ(3);

