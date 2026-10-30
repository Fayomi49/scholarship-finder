import "server-only";
import { z } from "zod";
import { RateLimitError, retryAt } from "./rate-limit";
import { publicUrlSchema } from "@/features/discovery/schema";

export const searchResultSchema = z.object({
  title: z.string().min(1).max(300),
  url: publicUrlSchema,
});
export type SearchResult = z.infer<typeof searchResultSchema>;
export async function search(query: string): Promise<SearchResult[]> {
  if (!process.env.TAVILY_API_KEY)
    throw new Error("search-credentials-required");
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
      auto_parameters: false,
    }),
  }).catch(() => {
    throw new Error("search-transient");
  });
  if (response.status === 429)
    throw new RateLimitError(
      "search-rate-limited",
      retryAt(response.headers.get("retry-after")),
    );
  if (!response.ok)
    throw new Error(
      response.status === 429 || response.status >= 500
        ? "search-transient"
        : "search-rejected",
    );
  const text = await response.text();
  if (text.length > 2000000) throw new Error("search-response-too-large");
  const payload = z
    .object({
      results: z
        .array(z.object({ title: z.string(), url: z.string() }))
        .max(50),
    })
    .parse(JSON.parse(text));
  return payload.results
    .flatMap((r) => {
      const parsed = searchResultSchema.safeParse(r);
      return parsed.success ? [parsed.data] : [];
    })
    .slice(0, 5);
}
