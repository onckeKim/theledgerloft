// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProgressBar } from "./progress-bar";

afterEach(cleanup);

describe("ProgressBar", () => {
  it("reports percent rounded down (L4 §2)", () => {
    render(<ProgressBar label="Transport" value={98000} max={140000} />);
    const bar = screen.getByRole("progressbar", { name: "Transport" });
    expect(bar.getAttribute("aria-valuenow")).toBe("70");
    expect(bar.getAttribute("aria-valuetext")).toBeNull();
  });

  it("keeps aria-valuenow in range and explains when over plan", () => {
    render(
      <ProgressBar label="Groceries" value={365000} max={340000} overText="R 250,00 over plan" />,
    );
    const bar = screen.getByRole("progressbar", { name: "Groceries" });
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect(bar.getAttribute("aria-valuetext")).toBe("R 250,00 over plan");
    expect((bar.firstElementChild as HTMLElement).className).toContain("bg-negative");
  });

  it("treats spending against a zero plan as over", () => {
    render(<ProgressBar label="Gifts" value={15000} max={0} overText="R 150,00 not planned" />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe(
      "R 150,00 not planned",
    );
  });
});
