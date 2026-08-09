import { describe, expect, it } from "vitest";

import { Health } from "../../src/components/Health";

describe("Health", () => {
  it("clamps initial, damaged, and reset values to 0..max", () => {
    const health = new Health(5, 99);
    expect(health.snapshot).toEqual({ currentHealth: 5, maxHealth: 5 });

    expect(health.commitDamage(9)).toEqual({
      previousHealth: 5,
      currentHealth: 0,
      maxHealth: 5,
      appliedDamage: 5,
    });
    expect(health.isAlive).toBe(false);
    expect(health.reset(-4)).toEqual({ currentHealth: 0, maxHealth: 5 });
    expect(health.reset()).toEqual({ currentHealth: 5, maxHealth: 5 });
  });

  it("rejects invalid health and damage values", () => {
    expect(() => new Health(0)).toThrow("greater than zero");
    expect(() => new Health(Number.NaN)).toThrow("finite");
    expect(() => new Health(5).commitDamage(-1)).toThrow(
      "must not be negative",
    );
  });
});
