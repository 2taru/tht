import { describe, expect, it } from "vitest";
import type { TimeEntry } from "@/types/domain";
import { findFreeSlot } from "./freeSlot";

function entry(startMinute: number, endMinute: number): TimeEntry {
  return {
    id: `${startMinute}`,
    workspaceId: "w",
    userId: "u",
    projectId: "p",
    taskId: null,
    entryDate: "2026-06-23",
    startMinute,
    endMinute,
    description: null,
  };
}

describe("findFreeSlot", () => {
  const dayStart = 540; // 09:00
  const dayEnd = 1140; // 19:00

  it("повертає preferredStart, якщо він вільний", () => {
    const e = [entry(540, 600)];
    expect(findFreeSlot(e, dayStart, dayEnd, 60, 600)).toBe(600);
  });

  it("знаходить наступний проміжок, якщо preferred зайнятий", () => {
    const e = [entry(600, 660)]; // preferred 600 перетинається
    expect(findFreeSlot(e, dayStart, dayEnd, 60, 600)).toBe(540);
  });

  it("шукає проміжок між записами", () => {
    const e = [entry(540, 600), entry(660, 720)];
    // preferred 600 вільний (600-660 між записами)
    expect(findFreeSlot(e, dayStart, dayEnd, 60, 600)).toBe(600);
  });

  it("повертає null, якщо місця немає", () => {
    const e = [entry(540, 1140)]; // увесь день зайнятий
    expect(findFreeSlot(e, dayStart, dayEnd, 60, 1140)).toBeNull();
  });

  it("не виходить за межі дня", () => {
    const e = [entry(540, 1080)];
    // лишилось 1080-1140 = 60 хв; потрібно 90 → null
    expect(findFreeSlot(e, dayStart, dayEnd, 90, 1080)).toBeNull();
    // потрібно 60 → 1080
    expect(findFreeSlot(e, dayStart, dayEnd, 60, 1080)).toBe(1080);
  });
});
