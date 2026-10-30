import "server-only";
import { z } from "zod";

const authEnv = z.object({
  DATABASE_URL: z.url().refine((value) => /^postgres(ql)?:/.test(value)),
  AUTH_SECRET: z.string().min(32),
  AUTH_GITHUB_ID: z.string().min(1),
  AUTH_GITHUB_SECRET: z.string().min(1),
  OWNER_GITHUB_ID: z.string().regex(/^[1-9]\d*$/),
});

export function authConfigured() {
  return authEnv.safeParse(process.env).success;
}
export function requireAuthEnv() {
  const parsed = authEnv.safeParse(process.env);
  if (!parsed.success)
    throw new Error(
      "Authentication is not configured. See README.md; environment values are never logged.",
    );
  return parsed.data;
}
