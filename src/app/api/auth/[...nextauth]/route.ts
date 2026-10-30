import type { NextRequest } from "next/server";
import { handlers } from "@/server/auth";
import { authConfigured } from "@/server/env";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!authConfigured())
    return Response.json(
      { error: "Authentication is not configured." },
      { status: 503 },
    );
  return handlers.GET(request);
}
export async function POST(request: NextRequest) {
  if (!authConfigured())
    return Response.json(
      { error: "Authentication is not configured." },
      { status: 503 },
    );
  return handlers.POST(request);
}
