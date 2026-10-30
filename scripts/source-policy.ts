import { z } from "zod";
import { db } from "../src/server/db";
import { safeUrl } from "../src/features/discovery/url-safety";

async function main() {
  const args = z
    .tuple([
      z.string().min(1),
      z.url(),
      z.enum(["official", "third-party", "deny"]),
      z.string().min(10),
    ])
    .parse(process.argv.slice(2));
  const [hostname, termsUrl, classification, notes] = args;
  const target = safeUrl(`https://${hostname}`);
  if (target.hostname !== hostname || target.pathname !== "/")
    throw new Error("Pass a hostname without a URL path.");
  safeUrl(termsUrl);
  await db().sourcePolicy.upsert({
    where: { hostname },
    create: {
      hostname,
      termsUrl,
      allowed: classification !== "deny",
      official: classification === "official",
      notes,
      checkedAt: new Date(),
    },
    update: {
      termsUrl,
      allowed: classification !== "deny",
      official: classification === "official",
      notes,
      checkedAt: new Date(),
    },
  });
  console.log(
    `Source policy recorded for ${hostname}. Robots rules will still be checked on every fetch cycle.`,
  );
}
main()
  .catch(() => {
    console.error(
      'Usage: npm run source:review -- HOST TERMS_URL official|third-party|deny "Notes describing the reviewed terms and permission"',
    );
    process.exitCode = 1;
  })
  .finally(() => db().$disconnect());
