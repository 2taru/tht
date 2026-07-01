import { describe, expect, it } from "vitest";
import {
  BUNDLE_FORMAT,
  bundleFilename,
  isBundleParseError,
  parseBundle,
  type WorkspaceBundle,
} from "./workspaceTransfer";

const sample: WorkspaceBundle = {
  format: BUNDLE_FORMAT,
  version: 1,
  exportedAt: "2026-07-01T00:00:00.000Z",
  workspaceName: "Програмування",
  labels: [{ name: "bug", color: "#f00" }],
  projects: [
    { name: "Site", color: "#111", hourlyRate: 50, isArchived: false },
  ],
  tasks: [
    {
      title: "Fix",
      description: null,
      status: "todo",
      priority: "high",
      startDate: null,
      dueDate: "2026-07-10",
      position: 1,
      projectIndex: 0,
      labelIndices: [0],
    },
  ],
  entries: [
    {
      entryDate: "2026-07-01",
      startMinute: 540,
      endMinute: 600,
      description: null,
      projectIndex: 0,
      taskIndex: 0,
    },
  ],
};

describe("parseBundle", () => {
  it("round-trips a valid bundle", () => {
    const parsed = parseBundle(JSON.stringify(sample));
    expect(parsed).toEqual(sample);
  });

  it("rejects non-JSON", () => {
    try {
      parseBundle("{not json");
      throw new Error("should have thrown");
    } catch (e) {
      expect(isBundleParseError(e)).toBe(true);
    }
  });

  it("rejects a foreign format", () => {
    try {
      parseBundle(JSON.stringify({ format: "something-else" }));
      throw new Error("should have thrown");
    } catch (e) {
      expect(isBundleParseError(e)).toBe(true);
    }
  });

  it("coerces missing arrays to empty and keeps index refs", () => {
    const parsed = parseBundle(
      JSON.stringify({ format: BUNDLE_FORMAT, projects: sample.projects }),
    );
    expect(parsed.tasks).toEqual([]);
    expect(parsed.entries).toEqual([]);
    expect(parsed.labels).toEqual([]);
    expect(parsed.projects[0].name).toBe("Site");
  });
});

describe("bundleFilename", () => {
  it("slugs the workspace name and appends a date", () => {
    expect(bundleFilename("Програмування")).toMatch(
      /^tht-програмування-\d{4}-\d{2}-\d{2}\.json$/,
    );
  });

  it("falls back when name has no usable chars", () => {
    expect(bundleFilename("   ")).toMatch(/^tht-workspace-/);
  });
});
