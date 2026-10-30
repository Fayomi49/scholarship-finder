import "server-only";
import { auth } from "@/server/auth";
import { authConfigured } from "@/server/env";
import { db } from "@/server/db";
import { isOwnerAccount } from "@/features/auth/owner-policy";

import { AccessError } from "./errors";
export { AccessError } from "./errors";

export async function requireOwner() {
  if (!authConfigured())
    throw new AccessError(503, "Owner sign-in is not configured.");
  const session = await auth();
  if (!session?.user?.id)
    throw new AccessError(401, "Sign in with your personal GitHub account.");
  const account = await db().account.findFirst({
    where: {
      userId: session.user.id,
      provider: "github",
      providerAccountId: process.env.OWNER_GITHUB_ID,
    },
  });
  if (
    !isOwnerAccount(
      account?.provider,
      account?.providerAccountId,
      process.env.OWNER_GITHUB_ID,
    )
  )
    throw new AccessError(403, "Owner access required.");
  return { id: session.user.id, name: session.user.name };
}
