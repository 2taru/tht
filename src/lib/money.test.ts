import { describe, expect, it } from "vitest";
import { billableAmount, formatMoney } from "./money";

describe("money", () => {
  it("billableAmount", () => {
    expect(billableAmount(120, 500)).toBe(1000); // 2 год × 500
    expect(billableAmount(90, 200)).toBe(300); // 1.5 × 200
    expect(billableAmount(120, null)).toBe(0);
  });

  it("formatMoney містить суму", () => {
    expect(formatMoney(1000, "UAH")).toContain("1");
  });

  it("formatMoney з невідомою валютою не падає", () => {
    expect(formatMoney(100, "ZZZ")).toContain("ZZZ");
  });
});
