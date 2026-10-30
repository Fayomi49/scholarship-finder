import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { AccessError } from "@/server/errors";
import { approvalSchema, opportunitySchema } from "@/features/discovery/schema";
import {
  identityKey,
  canonicalUrl,
  intakeKey,
} from "@/features/discovery/identity";
import { supportedGeography } from "@/features/discovery/geography";
import { safeUrl } from "@/features/discovery/url-safety";
import { json } from "./service";

export async function reviewCandidate(ownerId: string, input: unknown) {
  const command = approvalSchema.parse(input);
  try {
    return await db().$transaction(async (tx) => {
      // Lock the candidate before reading status so a double click is idempotent.
      await tx.$queryRaw`SELECT id FROM "DiscoveredCandidate" WHERE id = ${command.id} AND "ownerId" = ${ownerId} FOR UPDATE`;
      const candidate = await tx.discoveredCandidate.findFirst({
        where: { id: command.id, ownerId },
      });
      if (!candidate) throw new AccessError(404, "Candidate not found.");
      if (candidate.status === "APPROVED")
        return {
          id: candidate.id,
          status: candidate.status,
          scholarshipId: candidate.approvedScholarshipId,
        };
      if (candidate.status !== "PENDING")
        throw new AccessError(409, "This opportunity was already reviewed.");
      if (
        command.version &&
        candidate.updatedAt.toISOString() !== command.version
      )
        throw new AccessError(
          409,
          "This candidate changed. Reload before reviewing.",
        );
      const data = opportunitySchema.parse(command.data ?? candidate.data);
      let scholarshipId: string | undefined;
      if (command.action === "approve") {
        if (candidate.isMock)
          throw new AccessError(
            400,
            "Demo candidates cannot be added to the scholarship database.",
          );
        if (!command.officialSourceConfirmed || !command.importantClaimsChecked)
          throw new AccessError(
            400,
            "Confirm the official source and check the extracted claims before approving.",
          );
        if (
          !data.provider ||
          !data.opportunityType ||
          !data.fields.length ||
          (data.region === "unknown" && data.deliveryMode !== "remote")
        )
          throw new AccessError(
            400,
            "Enter the provider, opportunity type, technology field and target region before approving.",
          );
        if (!supportedGeography(data))
          throw new AccessError(
            400,
            "Confirm a supported destination country/region or an international remote programme.",
          );
        safeUrl(data.sourceUrl);
        if (data.applicationUrl) safeUrl(data.applicationUrl);
        const normalized = {
          ...data,
          sourceUrl: canonicalUrl(data.sourceUrl),
          applicationUrl: data.applicationUrl
            ? canonicalUrl(data.applicationUrl)
            : null,
        };
        const identity = identityKey(normalized);
        const edition = intakeKey(normalized);
        const urls = [
          normalized.sourceUrl,
          ...(normalized.applicationUrl ? [normalized.applicationUrl] : []),
        ];
        const existing = await tx.scholarship.findFirst({
          where: {
            OR: [
              { identityKey: identity },
              { canonicalUrl: { in: urls }, intakeKey: edition },
              { applicationUrl: { in: urls }, intakeKey: edition },
            ],
          },
        });
        if (existing)
          throw new AccessError(
            409,
            "This programme is already in your scholarship database.",
          );
        const scholarship = await tx.scholarship.create({
          data: {
            title: normalized.title,
            provider: normalized.provider!,
            country: normalized.country,
            region: normalized.region,
            deliveryMode: normalized.deliveryMode,
            opportunityType: normalized.opportunityType!,
            fields: normalized.fields,
            degreeLevels: normalized.degreeLevels,
            fundingType: normalized.fundingType,
            deadlineAt: normalized.deadlineInstant
              ? new Date(normalized.deadlineInstant)
              : null,
            sourceUrl: normalized.sourceUrl,
            applicationUrl: normalized.applicationUrl,
            identityKey: identity,
            intakeKey: edition,
            canonicalUrl: normalized.sourceUrl,
            data: json(normalized),
            verifiedAt: new Date(),
            createdById: ownerId,
            status: "PUBLISHED",
          },
        });
        scholarshipId = scholarship.id;
      }
      const status =
        command.action === "approve"
          ? "APPROVED"
          : command.action === "reject"
            ? "REJECTED"
            : "IGNORED";
      await tx.discoveredCandidate.update({
        where: { id: candidate.id },
        data: {
          status,
          data: json(data),
          approvedScholarshipId: scholarshipId,
          reviewedAt: new Date(),
        },
      });
      await tx.reviewEvent.create({
        data: {
          candidateId: candidate.id,
          reviewerId: ownerId,
          action: command.action,
          snapshot: json({
            data,
            officialSourceConfirmed: command.officialSourceConfirmed,
            importantClaimsChecked: command.importantClaimsChecked,
          }),
        },
      });
      return { id: candidate.id, status, scholarshipId };
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new AccessError(
        409,
        "Duplicate programme detected; reload your review queue.",
      );
    throw error;
  }
}
