import { describe, expect, it } from "vitest";
import { classifyDue } from "./dueDate";

describe("classifyDue", () => {
  const today = "2026-06-23";

  it("прострочено для минулих дат", () => {
    expect(classifyDue("2026-06-22", today)).toBe("overdue");
    expect(classifyDue("2026-01-01", today)).toBe("overdue");
  });

  it("сьогодні", () => {
    expect(classifyDue("2026-06-23", today)).toBe("today");
  });

  it("скоро (в межах горизонту)", () => {
    expect(classifyDue("2026-06-24", today)).toBe("soon");
    expect(classifyDue("2026-06-26", today)).toBe("soon"); // +3
  });

  it("none за межами горизонту або без дати", () => {
    expect(classifyDue("2026-06-27", today)).toBe("none"); // +4
    expect(classifyDue(null, today)).toBe("none");
  });
});
