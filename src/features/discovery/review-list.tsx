"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useHydrated } from "@/lib/use-hydrated";
import { Button } from "@/components/ui/button";
import { OpportunityEditor } from "./opportunity-editor";
import type { Opportunity } from "./schema";

type Candidate = {
  id: string;
  data: Opportunity;
  status: string;
  isMock: boolean;
  possibleDuplicateId: string | null;
  version: string;
  assessment: {
    eligibility: string;
    relevance: number;
    reasons: string[];
    expired: boolean;
  };
  sources: {
    url: string;
    status: string;
    checkedAt: string;
    evidence: unknown;
  }[];
};
export function ReviewList({ candidates }: { candidates: Candidate[] }) {
  const hydrated = useHydrated();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [claims, setClaims] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const router = useRouter();
  async function review(
    commands: {
      id: string;
      action: "approve" | "reject" | "ignore";
      data?: Opportunity;
      version: string;
    }[],
  ) {
    setBusy(true);
    setMessages([]);
    try {
      const response = await fetch("/api/discovery/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          commands.map((c) => ({
            ...c,
            officialSourceConfirmed: confirmed,
            importantClaimsChecked: claims,
          })),
        ),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Review failed.");
      setMessages(
        result.outcomes.map(
          (o: { ok: boolean; error?: string; status?: string }) =>
            o.ok
              ? `Opportunity ${o.status?.toLowerCase()}.`
              : (o.error ?? "Review failed."),
        ),
      );
      setSelected([]);
      router.refresh();
    } catch (e) {
      setMessages([
        e instanceof Error ? e.message : "Review failed. Please try again.",
      ]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mt-8">
      <div className="rounded-xl border border-border bg-accent p-5">
        <p className="text-sm leading-6">
          Before approving, open the source and check its authority, current
          intake, funding, deadline and stated requirements. Unknown facts can
          remain unknown.
        </p>
        <label className="mt-4 flex gap-3 text-sm">
          <input
            type="checkbox"
            disabled={!hydrated || busy}
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I confirm the source is the official programme provider or sponsor for
          every opportunity I approve.
        </label>
        <label className="mt-3 flex gap-3 text-sm">
          <input
            type="checkbox"
            disabled={!hydrated || busy}
            checked={claims}
            onChange={(e) => setClaims(e.target.checked)}
          />
          I checked the extracted claims against the official source and
          corrected unsupported details.
        </label>
        <Button
          className="mt-4"
          disabled={busy || !selected.length || !confirmed || !claims}
          onClick={() =>
            review(
              candidates
                .filter((c) => selected.includes(c.id))
                .map((c) => ({
                  id: c.id,
                  action: "approve",
                  version: c.version,
                })),
            )
          }
        >
          Approve selected ({selected.length}/25)
        </Button>
      </div>
      {messages.length > 0 && (
        <div
          role="status"
          className="my-5 space-y-2 rounded-lg border border-border p-4"
        >
          {messages.map((m, i) => (
            <p key={i}>{m}</p>
          ))}
        </div>
      )}
      {!candidates.length && (
        <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-muted-foreground">
          No opportunities in this view. Start a discovery run from your
          dashboard or choose another review status.
        </p>
      )}
      <div className="mt-6 space-y-6">
        {candidates.map((c) => (
          <article
            key={c.id}
            className="rounded-2xl border border-border bg-card p-5 sm:p-7"
          >
            <div className="flex gap-3">
              {c.status === "PENDING" && (
                <input
                  aria-label={`Select ${c.data.title}`}
                  type="checkbox"
                  disabled={
                    c.isMock ||
                    busy ||
                    (!selected.includes(c.id) && selected.length >= 25)
                  }
                  checked={selected.includes(c.id)}
                  onChange={(e) =>
                    setSelected((s) =>
                      e.target.checked
                        ? [...s, c.id]
                        : s.filter((id) => id !== c.id),
                    )
                  }
                  className="mt-2 size-5 shrink-0"
                />
              )}
              <div>
                <h2 className="font-serif text-2xl">{c.data.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {c.data.provider ?? "Provider unknown"} ·{" "}
                  {c.data.region.replaceAll("-", " ")} ·{" "}
                  {c.data.country ?? "Country unknown"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {[
                c.status.toLowerCase(),
                c.isMock ? "DEMO — cannot publish" : "",
                c.assessment.eligibility,
                c.possibleDuplicateId
                  ? "Possible duplicate — check before approval"
                  : "",
                c.assessment.expired ? "Expired deadline — verify intake" : "",
              ]
                .filter(Boolean)
                .map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-border bg-muted px-3 py-1"
                  >
                    {s}
                  </span>
                ))}
            </div>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Funding</dt>
                <dd className="mt-1">
                  {c.data.fundingType}
                  {c.data.stipendAmount !== null
                    ? ` · ${c.data.stipendCurrency} ${c.data.stipendAmount} (${c.data.stipendPeriod})`
                    : " · Stipend unknown"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Deadline</dt>
                <dd className="mt-1">
                  {c.data.deadlineInstant
                    ? new Date(c.data.deadlineInstant).toISOString()
                    : c.data.deadline
                      ? `${c.data.deadline} (timezone not stated)`
                      : c.data.deadlineType === "rolling"
                        ? "Rolling"
                        : "Unknown — needs verification"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Field</dt>
                <dd className="mt-1">
                  {c.data.fields.join(", ").replaceAll("-", " ") || "Unknown"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Opportunity</dt>
                <dd className="mt-1">
                  {c.data.opportunityType?.replaceAll("-", " ") ?? "Unknown"}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-5 text-sm">
              <a
                href={c.data.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-primary underline"
              >
                Original source ↗
              </a>
              {c.data.applicationUrl && (
                <a
                  href={c.data.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  Application link (confirm authority) ↗
                </a>
              )}
            </div>
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer">
                Eligibility explanation · relevance {c.assessment.relevance}
              </summary>
              <ul className="mt-3 list-inside list-disc space-y-2">
                {c.assessment.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </details>
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer">
                Source verification and evidence
              </summary>
              {c.sources.map((s, i) => (
                <div key={i} className="mt-3 space-y-2">
                  <p>
                    {s.status.replaceAll("-", " ")} · checked{" "}
                    {new Date(s.checkedAt).toISOString()}
                  </p>
                  <a
                    href={s.url}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="break-all text-primary underline"
                  >
                    {s.url}
                  </a>
                  {s.evidence && typeof s.evidence === "object"
                    ? Object.entries(s.evidence).map(([field, value]) => (
                        <p key={field} className="break-words">
                          {field}:{" "}
                          {value &&
                          typeof value === "object" &&
                          "excerpt" in value
                            ? String(value.excerpt)
                            : "No supporting excerpt"}
                        </p>
                      ))
                    : null}
                </div>
              ))}
            </details>
            {c.status === "PENDING" && (
              <>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    disabled={busy || c.isMock || !confirmed || !claims}
                    onClick={() =>
                      review([
                        { id: c.id, action: "approve", version: c.version },
                      ])
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!hydrated || busy}
                    onClick={() =>
                      review([
                        { id: c.id, action: "reject", version: c.version },
                      ])
                    }
                  >
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!hydrated || busy}
                    onClick={() =>
                      review([
                        { id: c.id, action: "ignore", version: c.version },
                      ])
                    }
                  >
                    Ignore
                  </Button>
                </div>
                {!c.isMock && (
                  <details className="mt-5">
                    <summary className="min-h-11 cursor-pointer py-3 font-semibold text-primary">
                      Edit and approve
                    </summary>
                    <OpportunityEditor
                      data={c.data}
                      busy={busy || !confirmed || !claims}
                      submit={(data) =>
                        review([
                          {
                            id: c.id,
                            action: "approve",
                            data,
                            version: c.version,
                          },
                        ])
                      }
                    />
                  </details>
                )}
              </>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
