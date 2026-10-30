import { z } from "zod";

export const githubIdSchema = z.string().regex(/^[1-9]\d*$/);

export function isOwnerAccount(
  provider: unknown,
  accountId: unknown,
  ownerId: unknown,
): boolean {
  return (
    provider === "github" &&
    githubIdSchema.safeParse(ownerId).success &&
    typeof accountId === "string" &&
    accountId === ownerId
  );
}
