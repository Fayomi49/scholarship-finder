import Link from "next/link";
import { pageOwner } from "@/server/page-owner";
import { db } from "@/server/db";
import { signOut } from "@/server/auth";
import { RunPanel } from "@/features/discovery/run-panel";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your dashboard" };
export default async function DashboardPage() {
  const owner = await pageOwner();
  const [runs, pending, published] = await Promise.all([
    db().discoveryRun.findMany({
      where: { ownerId: owner.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db().discoveredCandidate.count({
      where: { ownerId: owner.id, status: "PENDING" },
    }),
    db().scholarship.count({
      where: { createdById: owner.id, status: "PUBLISHED" },
    }),
  ]);
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-primary">Your personal workspace</p>
          <h1 className="mt-3 font-serif text-4xl">
            Welcome back{owner.name ? `, ${owner.name}` : ""}.
          </h1>
          <p className="mt-4 text-muted-foreground">
            {pending} awaiting review · {published} approved opportunities
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <Button variant="outline" type="submit">
            Sign out
          </Button>
        </form>
      </div>
      <Link
        href="/profile"
        className="mt-5 inline-block min-h-11 py-3 font-semibold text-primary underline underline-offset-4"
      >
        Edit your matching preferences
      </Link>
      <RunPanel
        initialRuns={JSON.parse(JSON.stringify(runs))}
        provider={process.env.DISCOVERY_SEARCH_PROVIDER ?? "mock"}
      />
    </div>
  );
}
