import { beforeEach, describe, expect, it } from "vitest";
import { useMailStore } from "@/store/mail-store";

describe("mail store actions", () => {
  beforeEach(() => useMailStore.setState({ currentView: "inbox", filters: { sender: "", keyword: "", after: "", before: "", unread: false }, composeState: { to: "", cc: "", subject: "", body: "", mode: "new" } }));

  it("shares filter state between UI and AI actions", () => {
    useMailStore.getState().setFilters({ unread: true, sender: "sarah@example.com" });
    expect(useMailStore.getState().filters).toMatchObject({ unread: true, sender: "sarah@example.com" });
  });

  it("opens a visibly populated compose state", () => {
    useMailStore.getState().openCompose({ to: "john@example.com", subject: "Meeting Tomorrow", body: "Let's meet at 3pm" });
    expect(useMailStore.getState()).toMatchObject({ currentView: "compose", composeState: { to: "john@example.com", subject: "Meeting Tomorrow", body: "Let's meet at 3pm" } });
  });
});
