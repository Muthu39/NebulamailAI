import { describe, expect, it } from "vitest";
import { buildGmailQuery } from "@/lib/gmail/client";
import { emptyFilters } from "@/types/mail";

describe("buildGmailQuery", () => {
  it("combines Gmail-safe filters", () => {
    expect(buildGmailQuery({ ...emptyFilters, sender: "sarah@example.com", keyword: "project update", after: "2026-08-01", before: "2026-08-31", unread: true }, "roadmap")).toBe("roadmap from:sarah@example.com project update after:2026-08-01 before:2026-08-31 is:unread");
  });

  it("returns an empty query for empty filters", () => {
    expect(buildGmailQuery(emptyFilters)).toBe("");
  });
});
