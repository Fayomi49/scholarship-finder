import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { ProfileForm } from "./profile-form";

it("saves a nationality while preserving unspecified residence and destination preferences", async () => {
  const request = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ saved: true }) });
  vi.stubGlobal("fetch", request);
  render(
    <ProfileForm
      initial={{
        nationality: null,
        residenceCountry: null,
        preferredDegree: null,
        preferredFields: [],
        preferredCountries: [],
        fundingPreference: "unknown",
      }}
    />,
  );
  fireEvent.change(
    screen.getByLabelText("Nationality (country code, optional)"),
    { target: { value: "ng" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Save preferences" }));
  await waitFor(() =>
    expect(screen.getByText("Preferences saved.")).toBeInTheDocument(),
  );
  const payload = JSON.parse(request.mock.calls[0][1].body);
  expect(payload.nationality).toBe("NG");
  expect(payload.residenceCountry).toBeNull();
  expect(payload.preferredCountries).toEqual([]);
  vi.unstubAllGlobals();
});
