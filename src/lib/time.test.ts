import { describe, expect, it } from "vitest";
import {
  clampMinute,
  durationMinutes,
  formatHours,
  intervalsOverlap,
  minutesToHours,
  minutesToLabel,
  minutesToTimeValue,
  snapToStep,
  timeValueToMinutes,
} from "./time";

describe("time", () => {
  it("minutesToLabel", () => {
    expect(minutesToLabel(540)).toBe("9:00");
    expect(minutesToLabel(570)).toBe("9:30");
    expect(minutesToLabel(0)).toBe("0:00");
  });

  it("minutesToHours", () => {
    expect(minutesToHours(90)).toBe(1.5);
    expect(minutesToHours(390)).toBe(6.5);
  });

  it("formatHours", () => {
    expect(formatHours(390)).toBe("6,5");
    expect(formatHours(240)).toBe("4");
    expect(formatHours(30)).toBe("0,5");
  });

  it("snapToStep", () => {
    expect(snapToStep(547, 10)).toBe(550);
    expect(snapToStep(544, 10)).toBe(540);
  });

  it("durationMinutes", () => {
    expect(durationMinutes(540, 660)).toBe(120);
  });

  it("intervalsOverlap", () => {
    expect(intervalsOverlap(540, 600, 600, 660)).toBe(false); // дотик
    expect(intervalsOverlap(540, 620, 600, 660)).toBe(true);
    expect(intervalsOverlap(540, 600, 480, 560)).toBe(true);
  });

  it("minutesToTimeValue / timeValueToMinutes", () => {
    expect(minutesToTimeValue(540)).toBe("09:00");
    expect(minutesToTimeValue(570)).toBe("09:30");
    expect(timeValueToMinutes("09:30")).toBe(570);
    expect(timeValueToMinutes("19:00")).toBe(1140);
  });

  it("clampMinute", () => {
    expect(clampMinute(1200, 540, 1140)).toBe(1140);
    expect(clampMinute(300, 540, 1140)).toBe(540);
    expect(clampMinute(700, 540, 1140)).toBe(700);
  });
});
