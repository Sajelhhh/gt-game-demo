import { describe, expect, it } from "vitest";

import { ContactGuard } from "../../src/combat/ContactGuard";

describe("ContactGuard", () => {
  it("protects only the engaged enemy and expires at the configured time", () => {
    const guard = new ContactGuard();
    guard.grant("enemy-front", 100, 260);

    expect(guard.protectsAgainst("enemy-front", 359)).toBe(true);
    expect(guard.protectsAgainst("enemy-behind", 359)).toBe(false);
    expect(guard.protectsAgainst("enemy-front", 360)).toBe(false);
  });

  it("extends an existing guard without shortening it", () => {
    const guard = new ContactGuard();
    guard.grant("enemy", 100, 260);
    guard.grant("enemy", 200, 20);
    expect(guard.protectsAgainst("enemy", 359)).toBe(true);

    guard.grant("enemy", 300, 260);
    expect(guard.protectsAgainst("enemy", 559)).toBe(true);
    guard.clear();
    expect(guard.protectsAgainst("enemy", 400)).toBe(false);
  });
});
