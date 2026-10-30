"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  opportunitySchema,
  fields,
  types,
  regions,
  fundingTypes,
  type Opportunity,
} from "./schema";

const inputClass =
  "mt-2 block w-full rounded-lg border border-border bg-background p-3";
const nullable = (v: unknown) => (typeof v === "string" ? v.trim() || null : v);
const codes = (v: unknown) =>
  typeof v === "string"
    ? v.trim()
      ? v.split(",").map((s) => s.trim())
      : null
    : v;
const tri = (v: unknown) =>
  v === true || v === "true"
    ? true
    : v === false || v === "false"
      ? false
      : null;

export function OpportunityEditor({
  data,
  submit,
  busy,
}: {
  data: Opportunity;
  submit: (data: Opportunity) => Promise<void>;
  busy: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isReady },
  } = useForm<Opportunity>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: data,
  });
  const texts = [
    "title",
    "provider",
    "country",
    "sourceUrl",
    "applicationUrl",
    "intake",
    "deadline",
    "deadlineInstant",
    "deadlineRaw",
    "stipendCurrency",
  ] as const;
  const names = {
    title: "Programme name",
    provider: "Provider",
    country: "Destination country code",
    sourceUrl: "Official source URL",
    applicationUrl: "Official application URL",
    intake: "Intake or cohort",
    deadline: "Deadline date (YYYY-MM-DD)",
    deadlineInstant: "Exact deadline with timezone, if stated",
    deadlineRaw: "Deadline wording from provider",
    stipendCurrency: "Stipend currency (e.g. EUR)",
  };
  return (
    <form className="mt-5 space-y-5" onSubmit={handleSubmit(submit)}>
      <fieldset disabled={!isReady || busy} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {texts.map((key) => (
            <label key={key} className="text-sm">
              {names[key]}
              <input
                {...register(
                  key,
                  key === "title" ? {} : { setValueAs: nullable },
                )}
                className={inputClass}
              />
              {errors[key] && <span role="alert">{errors[key]?.message}</span>}
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { key: "region", values: regions },
            {
              key: "deliveryMode",
              values: ["unknown", "in-person", "remote", "hybrid"],
            },
            { key: "fundingType", values: fundingTypes },
            { key: "opportunityType", values: ["", ...types] },
            { key: "deadlineType", values: ["unknown", "fixed", "rolling"] },
            {
              key: "stipendPeriod",
              values: ["unknown", "month", "year", "total"],
            },
          ].map(({ key, values }) => (
            <label key={key} className="text-sm">
              {key.replace(/([A-Z])/g, " $1").toLowerCase()}
              <select
                {...register(
                  key as "region",
                  key === "opportunityType" ? { setValueAs: nullable } : {},
                )}
                className={inputClass}
              >
                {values.map((v) => (
                  <option key={v} value={v}>
                    {v.replaceAll("-", " ") || "unknown"}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <fieldset>
          <legend className="mb-3 text-sm">Technology fields</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {fields.map((f) => (
              <label key={f} className="flex gap-2 text-sm">
                <input type="checkbox" value={f} {...register("fields")} />
                {f.replaceAll("-", " ")}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm">Degree or training levels</legend>
          <div className="flex flex-wrap gap-4">
            {["masters", "phd", "bachelors", "training"].map((f) => (
              <label key={f} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  value={f}
                  {...register("degreeLevels")}
                />
                {f}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm">
          Stipend amount (leave blank if unknown)
          <input
            type="number"
            min="0"
            step="0.01"
            {...register("stipendAmount", {
              setValueAs: (v: unknown) =>
                v === "" || v === null || v === undefined ? null : Number(v),
            })}
            className={inputClass}
          />
          {errors.stipendAmount && (
            <span role="alert">{errors.stipendAmount.message}</span>
          )}
        </label>
        {["fundingDetails", "description", "otherRequirements"].map((key) => (
          <label key={key} className="block text-sm">
            {key.replace(/([A-Z])/g, " $1").toLowerCase()}
            <textarea
              {...register(key as "fundingDetails", { setValueAs: nullable })}
              rows={4}
              className={inputClass}
            />
          </label>
        ))}
        <p className="text-sm leading-6 text-muted-foreground">
          Keep unstated restrictions unknown. Only mark a restriction as absent
          when the provider explicitly says so.
        </p>
        {[
          {
            key: "nationalityUnrestricted",
            label: "Are all nationalities explicitly permitted?",
          },
          {
            key: "residenceUnrestricted",
            label: "Does the provider explicitly allow any residence?",
          },
          {
            key: "fieldRestrictions",
            label: "Does the provider restrict fields?",
          },
          {
            key: "degreeRestrictions",
            label: "Does the provider restrict degree levels?",
          },
        ].map(({ key, label }) => (
          <label key={key} className="block text-sm">
            {label}
            <select
              {...register(key as "nationalityUnrestricted", {
                setValueAs: tri,
              })}
              defaultValue={
                data[key as "nationalityUnrestricted"] === null
                  ? ""
                  : String(data[key as "nationalityUnrestricted"])
              }
              className={inputClass}
            >
              <option value="">Unknown</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </label>
        ))}
        {[
          {
            key: "eligibleNationalities",
            label: "Eligible nationality country codes",
          },
          {
            key: "residenceCountries",
            label: "Permitted residence country codes",
          },
        ].map(({ key, label }) => (
          <label key={key} className="block text-sm">
            {label} (comma separated; blank means unknown)
            <input
              {...register(key as "eligibleNationalities", {
                setValueAs: codes,
              })}
              defaultValue={
                data[key as "eligibleNationalities"]?.join(", ") ?? ""
              }
              className={inputClass}
            />
          </label>
        ))}
        <label className="flex gap-3 text-sm">
          <input type="checkbox" {...register("allRequirementsCaptured")} />I
          checked that all eligibility requirements are captured. Additional
          requirements still need individual assessment.
        </label>
        {Object.keys(errors).length > 0 && (
          <p role="alert">
            Check the programme details, country codes, dates and funding fields
            before approving.
          </p>
        )}
        <Button disabled={busy} type="submit">
          Save edits and approve
        </Button>
      </fieldset>
    </form>
  );
}
