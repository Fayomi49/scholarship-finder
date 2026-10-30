import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalDb = globalThis as unknown as { scholarshipDb?: PrismaClient };
export function db() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is required. See README.md.");
  if (!globalDb.scholarshipDb)
    globalDb.scholarshipDb = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        connectionTimeoutMillis: 5000,
      }),
    });
  return globalDb.scholarshipDb;
}
