-- DropIndex
DROP INDEX "Scholarship_canonicalUrl_key";

-- DropIndex
DROP INDEX "DiscoveredCandidate_ownerId_canonicalUrl_isMock_key";

-- AlterTable
ALTER TABLE "Scholarship" ADD COLUMN     "intakeKey" TEXT NOT NULL DEFAULT 'unspecified-intake';

-- AlterTable
ALTER TABLE "DiscoveredCandidate" ADD COLUMN     "intakeKey" TEXT NOT NULL DEFAULT 'unspecified-intake';

-- Preserve known intakes for any records already created before this migration.
UPDATE "Scholarship" SET "intakeKey" = COALESCE(NULLIF(LOWER(TRIM("data"->>'intake')), ''), 'unspecified-intake');
UPDATE "DiscoveredCandidate" SET "intakeKey" = COALESCE(NULLIF(LOWER(TRIM("data"->>'intake')), ''), 'unspecified-intake');

-- CreateIndex
CREATE UNIQUE INDEX "Scholarship_canonicalUrl_intakeKey_key" ON "Scholarship"("canonicalUrl", "intakeKey");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredCandidate_ownerId_canonicalUrl_intakeKey_isMock_key" ON "DiscoveredCandidate"("ownerId", "canonicalUrl", "intakeKey", "isMock");

