import { describe, expect, it } from "vitest";
import { safeNavigationUrl } from "@/lib/safeUrl";

describe("safeNavigationUrl", () => {
  it("accepts internal paths and HTTP(S) URLs", () => {
    expect(safeNavigationUrl("/lore/characters/char-001")).toBe("/lore/characters/char-001");
    expect(safeNavigationUrl("https://example.com/path")).toBe("https://example.com/path");
  });

  it("rejects executable and protocol-relative URLs", () => {
    expect(safeNavigationUrl("javascript:alert(1)")).toBeNull();
    expect(safeNavigationUrl("data:text/html,test")).toBeNull();
    expect(safeNavigationUrl("//example.com/path")).toBeNull();
    expect(safeNavigationUrl("/\\example.com/path")).toBeNull();
  });
});
