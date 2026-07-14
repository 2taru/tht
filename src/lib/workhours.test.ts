import { describe, expect, it } from "vitest";
import { plannedMinutes, workDaysInRange } from "./workhours";

const MON_FRI = [1, 2, 3, 4, 5];

describe("workDaysInRange", () => {
  it("рахує робочі дні пн–пт за повний місяць", () => {
    // Липень 2026: 1-е — середа; у місяці 23 робочі дні (пн–пт).
    expect(workDaysInRange("2026-07-01", "2026-07-31", MON_FRI)).toBe(23);
  });

  it("одна межа включно (той самий день)", () => {
    // 2026-07-14 — вівторок (робочий).
    expect(workDaysInRange("2026-07-14", "2026-07-14", MON_FRI)).toBe(1);
    // 2026-07-12 — неділя (вихідний).
    expect(workDaysInRange("2026-07-12", "2026-07-12", MON_FRI)).toBe(0);
  });

  it("тиждень із вихідними", () => {
    // Пн 2026-07-13 … нд 2026-07-19 → 5 робочих днів.
    expect(workDaysInRange("2026-07-13", "2026-07-19", MON_FRI)).toBe(5);
  });

  it("користувацький набір днів (напр. пн/ср/пт)", () => {
    expect(workDaysInRange("2026-07-13", "2026-07-19", [1, 3, 5])).toBe(3);
  });

  it("порожній набір днів → 0", () => {
    expect(workDaysInRange("2026-07-01", "2026-07-31", [])).toBe(0);
  });

  it("from > to → 0", () => {
    expect(workDaysInRange("2026-07-31", "2026-07-01", MON_FRI)).toBe(0);
  });
});

describe("plannedMinutes", () => {
  it("множить робочі дні на тривалість дня", () => {
    // 23 робочих дні * 480 хв = 11040 хв (184 год).
    expect(plannedMinutes("2026-07-01", "2026-07-31", MON_FRI, 480)).toBe(11040);
  });
});
