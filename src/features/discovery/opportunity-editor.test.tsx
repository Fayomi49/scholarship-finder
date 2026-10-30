import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { OpportunityEditor } from "./opportunity-editor";
import { unknownOpportunity } from "./schema";

it("preserves an unknown stipend and explicit eligibility booleans when editing another field", async () => {
  const submit = vi.fn().mockResolvedValue(undefined);
  const data = {
    ...unknownOpportunity(
      "Example technology programme",
      "https://provider.example/",
    ),
    nationalityUnrestricted: true,
    fieldRestrictions: false,
  };
  render(<OpportunityEditor data={data} submit={submit} busy={false} />);
  fireEvent.change(screen.getByLabelText("Programme name"), {
    target: { value: "Updated example programme" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Save edits and approve" }),
  );
  await waitFor(() => expect(submit).toHaveBeenCalled());
  const result = submit.mock.calls[0][0];
  expect(result.stipendAmount).toBeNull();
  expect(result.stipendCurrency).toBeNull();
  expect(result.nationalityUnrestricted).toBe(true);
  expect(result.fieldRestrictions).toBe(false);
});
