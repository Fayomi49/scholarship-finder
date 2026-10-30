import { requireOwner } from "@/server/owner";
import { mutationOrigin, apiError } from "@/server/http";
import { db } from "@/server/db";
import { startRun } from "@/server/discovery/service";
import { filtersSchema } from "@/features/discovery/schema";

export async function GET() {
  try {
    const owner = await requireOwner();
    return Response.json(
      await db().discoveryRun.findMany({
        where: { ownerId: owner.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    mutationOrigin(request);
    const owner = await requireOwner();
    const input = filtersSchema.parse(await request.json());
    const result = await startRun(owner.id, input);
    return Response.json(result, { status: result.existing ? 200 : 202 });
  } catch (error) {
    return apiError(error);
  }
}
