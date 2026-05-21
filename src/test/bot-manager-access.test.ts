import { describe, expect, it } from "vitest";
import { canAccessBotManager } from "@/lib/pl";

describe("bot manager access", () => {
  it("allows PL7 author and admin", () => {
    expect(canAccessBotManager(7, "author")).toBe(true);
    expect(canAccessBotManager(7, "admin")).toBe(true);
  });

  it("blocks security, guest, and lower clearance users", () => {
    expect(canAccessBotManager(7, "security")).toBe(false);
    expect(canAccessBotManager(0, "guest")).toBe(false);
    expect(canAccessBotManager(6, "author")).toBe(false);
  });
});
