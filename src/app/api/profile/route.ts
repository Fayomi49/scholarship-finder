import { requireOwner } from "@/server/owner";
import { mutationOrigin, apiError } from "@/server/http";
import { profileSchema } from "@/features/discovery/schema";
import { db } from "@/server/db";

export async function PUT(request: Request) {
  try {
    mutationOrigin(request);
    const owner = await requireOwner();
    const data = profileSchema.parse(await request.json());
    await db().userProfile.upsert({
      where: { userId: owner.id },
      create: { userId: owner.id, ...data },
      update: data,
    });
    return Response.json({ saved: true });
  } catch (error) {
    return apiError(error);
  }
}
