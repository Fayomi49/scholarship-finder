import { requireOwner } from "@/server/owner";
import { apiError } from "@/server/http";
import { db } from "@/server/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const owner = await requireOwner();
    const { id } = await params;
    const run = await db().discoveryRun.findFirst({
      where: { id, ownerId: owner.id },
    });
    if (!run)
      return Response.json({ error: "Run not found." }, { status: 404 });
    return Response.json(run, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
