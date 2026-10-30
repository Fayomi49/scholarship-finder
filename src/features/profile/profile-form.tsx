"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  profileSchema,
  fields,
  fundingTypes,
  type Profile,
} from "@/features/discovery/schema";
import { Button } from "@/components/ui/button";

export function ProfileForm({ initial }: { initial: Profile }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isReady },
  } = useForm<Profile>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
  });
  const [message, setMessage] = useState("");
  return (
    <form
      className="mt-8 max-w-2xl space-y-5"
      onSubmit={handleSubmit(async (data) => {
        setMessage("");
        try {
          const response = await fetch("/api/profile", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(data),
          });
          const result = await response.json();
          setMessage(
            response.ok
              ? "Preferences saved."
              : (result.error ?? "Could not save preferences."),
          );
        } catch {
          setMessage("Could not save preferences. Please try again.");
        }
      })}
    >
      <fieldset disabled={!isReady || isSubmitting} className="space-y-5">
        {[
          { key: "nationality", label: "Nationality" },
          { key: "residenceCountry", label: "Country of residence" },
        ].map(({ key, label }) => (
          <label key={key} className="block text-sm">
            {label} (country code, optional)
            <input
              {...register(key as "nationality" | "residenceCountry", {
                setValueAs: (v: unknown) =>
                  typeof v === "string" ? v.trim() || null : (v ?? null),
              })}
              placeholder="e.g. NG"
              maxLength={2}
              className="mt-2 block w-full rounded-lg border border-border bg-card p-3"
            />
          </label>
        ))}
        <label className="block text-sm">
          Desired level
          <select
            {...register("preferredDegree", {
              setValueAs: (v: string) => v || null,
            })}
            className="mt-2 block w-full rounded-lg border border-border bg-card p-3"
          >
            <option value="">Not specified</option>
            {["masters", "phd", "bachelors", "training"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="mb-3 text-sm">Preferred technology fields</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <label key={f} className="flex min-h-8 gap-2 text-sm">
                <input
                  type="checkbox"
                  value={f}
                  {...register("preferredFields")}
                />
                {f.replaceAll("-", " ")}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm">
          Preferred destination country codes (comma separated)
          <input
            {...register("preferredCountries", {
              setValueAs: (v: unknown) =>
                typeof v === "string"
                  ? v
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : v,
            })}
            defaultValue={initial.preferredCountries.join(", ")}
            className="mt-2 block w-full rounded-lg border border-border bg-card p-3"
          />
        </label>
        <label className="block text-sm">
          Funding preference
          <select
            {...register("fundingPreference")}
            className="mt-2 block w-full rounded-lg border border-border bg-card p-3"
          >
            {fundingTypes.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="text-sm">
            Check country codes and preferences. Use valid two-letter country
            codes.
          </p>
        )}
        <p className="text-sm leading-6 text-muted-foreground">
          Matching uses these preferences and the provider’s stated
          restrictions. Missing requirements always need verification.
        </p>
        <Button type="submit" disabled={isSubmitting}>
          Save preferences
        </Button>
        {message && <p role="status">{message}</p>}
      </fieldset>
    </form>
  );
}
