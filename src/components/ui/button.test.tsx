import Link from "next/link";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";

describe("Button", () => {
  it("does not submit a form unless explicitly requested", () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <Button>Continue</Button>
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(submit).not.toHaveBeenCalled();
  });

  it("preserves native link semantics when composed with a link", () => {
    render(
      <Button asChild>
        <Link href="/scholarships">Explore</Link>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Explore" })).toHaveAttribute(
      "href",
      "/scholarships",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
