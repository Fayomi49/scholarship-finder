import "server-only";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/server/db";
import { requireAuthEnv } from "@/server/env";
import { isOwnerAccount } from "@/features/auth/owner-policy";

export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const env = requireAuthEnv();
  return {
    adapter: PrismaAdapter(db()),
    secret: env.AUTH_SECRET,
    session: { strategy: "database" },
    providers: [
      GitHub({
        clientId: env.AUTH_GITHUB_ID,
        clientSecret: env.AUTH_GITHUB_SECRET,
        authorization: { params: { scope: "read:user user:email" } },
      }),
    ],
    pages: { signIn: "/sign-in", error: "/sign-in" },
    callbacks: {
      signIn: ({ account }) =>
        isOwnerAccount(
          account?.provider,
          account?.providerAccountId,
          env.OWNER_GITHUB_ID,
        ),
      session: ({ session, user }) => {
        session.user.id = user.id;
        return session;
      },
    },
  };
});
