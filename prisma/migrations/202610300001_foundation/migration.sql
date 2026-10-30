-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SEEKER', 'ADMIN');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'IGNORED');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'SEEKER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "userId" TEXT NOT NULL,
    "nationality" TEXT,
    "residenceCountry" TEXT,
    "preferredDegree" TEXT,
    "preferredFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fundingPreference" TEXT NOT NULL DEFAULT 'unknown',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Scholarship" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "country" TEXT,
    "region" TEXT NOT NULL DEFAULT 'unknown',
    "deliveryMode" TEXT NOT NULL DEFAULT 'unknown',
    "opportunityType" TEXT NOT NULL,
    "fields" TEXT[],
    "degreeLevels" TEXT[],
    "fundingType" TEXT NOT NULL DEFAULT 'unknown',
    "deadlineAt" TIMESTAMPTZ(3),
    "sourceUrl" TEXT NOT NULL,
    "applicationUrl" TEXT,
    "verifiedAt" TIMESTAMPTZ(3),
    "identityKey" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedScholarship" (
    "userId" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'interested',
    "notes" TEXT,
    "appliedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedScholarship_pkey" PRIMARY KEY ("userId","scholarshipId")
);

-- CreateTable
CREATE TABLE "DiscoveryRun" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "stage" TEXT NOT NULL DEFAULT 'queued',
    "filters" JSONB NOT NULL,
    "queries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nextQuery" INTEGER NOT NULL DEFAULT 0,
    "searchCalls" INTEGER NOT NULL DEFAULT 0,
    "pagesFetched" INTEGER NOT NULL DEFAULT 0,
    "resultsCount" INTEGER NOT NULL DEFAULT 0,
    "duplicatesCount" INTEGER NOT NULL DEFAULT 0,
    "reviewedCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMPTZ(3),
    "finishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveryRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveredCandidate" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "possibleDuplicateId" TEXT,
    "approvedScholarshipId" TEXT,
    "reviewedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveredCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveryObservation" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "candidateId" TEXT,
    "outcome" TEXT NOT NULL,
    "searchData" JSONB NOT NULL DEFAULT '{}',
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoveryObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSource" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'unverified',
    "evidence" JSONB NOT NULL,
    "fetchedAt" TIMESTAMPTZ(3),
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewEvent" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourcePolicy" (
    "hostname" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,
    "official" BOOLEAN NOT NULL DEFAULT false,
    "termsUrl" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "checkedAt" TIMESTAMPTZ(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcePolicy_pkey" PRIMARY KEY ("hostname")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Scholarship_identityKey_key" ON "Scholarship"("identityKey");

-- CreateIndex
CREATE UNIQUE INDEX "Scholarship_canonicalUrl_key" ON "Scholarship"("canonicalUrl");

-- CreateIndex
CREATE INDEX "Scholarship_status_country_deadlineAt_idx" ON "Scholarship"("status", "country", "deadlineAt");

-- CreateIndex
CREATE INDEX "Scholarship_fields_idx" ON "Scholarship" USING GIN ("fields");

-- CreateIndex
CREATE INDEX "DiscoveryRun_ownerId_createdAt_idx" ON "DiscoveryRun"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "DiscoveryRun_status_idx" ON "DiscoveryRun"("status");

-- CreateIndex
CREATE INDEX "DiscoveredCandidate_ownerId_status_createdAt_idx" ON "DiscoveredCandidate"("ownerId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredCandidate_ownerId_canonicalUrl_isMock_key" ON "DiscoveredCandidate"("ownerId", "canonicalUrl", "isMock");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredCandidate_ownerId_identityKey_isMock_key" ON "DiscoveredCandidate"("ownerId", "identityKey", "isMock");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveryObservation_runId_url_key" ON "DiscoveryObservation"("runId", "url");

-- CreateIndex
CREATE INDEX "CandidateSource_candidateId_idx" ON "CandidateSource"("candidateId");

-- CreateIndex
CREATE INDEX "ReviewEvent_candidateId_createdAt_idx" ON "ReviewEvent"("candidateId", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedScholarship" ADD CONSTRAINT "SavedScholarship_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedScholarship" ADD CONSTRAINT "SavedScholarship_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryRun" ADD CONSTRAINT "DiscoveryRun_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveredCandidate" ADD CONSTRAINT "DiscoveredCandidate_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveredCandidate" ADD CONSTRAINT "DiscoveredCandidate_approvedScholarshipId_fkey" FOREIGN KEY ("approvedScholarshipId") REFERENCES "Scholarship"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryObservation" ADD CONSTRAINT "DiscoveryObservation_runId_fkey" FOREIGN KEY ("runId") REFERENCES "DiscoveryRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveryObservation" ADD CONSTRAINT "DiscoveryObservation_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "DiscoveredCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSource" ADD CONSTRAINT "CandidateSource_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "DiscoveredCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewEvent" ADD CONSTRAINT "ReviewEvent_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "DiscoveredCandidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewEvent" ADD CONSTRAINT "ReviewEvent_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Enforce owner-wide discovery mutual exclusion across processes.
CREATE UNIQUE INDEX "DiscoveryRun_one_active_owner" ON "DiscoveryRun" ("ownerId") WHERE "status" IN ('QUEUED', 'RUNNING');
