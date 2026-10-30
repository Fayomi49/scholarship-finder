import "server-only";
import { ZodError } from "zod";
import { AccessError } from "@/server/errors";

export function mutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.AUTH_URL ?? request.url).origin;
  if (!origin || origin !== expected)
    throw new AccessError(403, "Invalid request origin.");
}
export function apiError(error: unknown) {
  if (error instanceof AccessError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError)
    return Response.json({ error: "Invalid JSON input." }, { status: 400 });
  if (error instanceof ZodError)
    return Response.json(
      {
        error: "Invalid input.",
        issues: error.issues.map(({ path, message }) => ({ path, message })),
      },
      { status: 400 },
    );
  return Response.json(
    {
      error:
        "The operation could not be completed. Check the database and worker configuration.",
    },
    { status: 500 },
  );
}
