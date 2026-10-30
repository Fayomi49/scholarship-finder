import { z } from "zod";
import { requireOwner, AccessError } from "@/server/owner";
import { mutationOrigin, apiError } from "@/server/http";
import { reviewCandidate } from "@/server/discovery/review";
import { approvalSchema } from "@/features/discovery/schema";

export async function POST(request: Request) {
  try {
    mutationOrigin(request);
    const owner = await requireOwner();
    const body = await request.text();
    if (body.length > 1000000)
      throw new AccessError(413, "Review request is too large.");
    const commands = z
      .array(approvalSchema)
      .min(1)
      .max(25)
      .parse(JSON.parse(body));
    const outcomes = [];
    for (const command of commands) {
      try {
        outcomes.push({
          ...(await reviewCandidate(owner.id, command)),
          ok: true,
        });
      } catch (error) {
        const response = apiError(error);
        outcomes.push({
          id: command.id,
          ok: false,
          ...(await response.json()),
        });
      }
    }
    return Response.json({ outcomes });
  } catch (error) {
    return apiError(error);
  }
}
