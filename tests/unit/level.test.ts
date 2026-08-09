import { describe, expect, it } from "vitest";

import {
  LEVEL_01,
  validateLevelLayout,
  type LevelLayout,
} from "../../src/level/level01";

const VIEWPORT = { width: 1_280, height: 720 } as const;

describe("level-01 layout", () => {
  it("keeps every collision rectangle inside camera and physics bounds", () => {
    expect(validateLevelLayout(LEVEL_01, VIEWPORT)).toEqual([]);
    expect(LEVEL_01.bounds.width).toBeGreaterThan(VIEWPORT.width);
    expect(LEVEL_01.bounds.height).toBe(VIEWPORT.height);
  });

  it("contains boundary walls, ground and traversable platforms", () => {
    expect(LEVEL_01.world.filter(({ kind }) => kind === "wall")).toHaveLength(
      2,
    );
    expect(LEVEL_01.world.some(({ kind }) => kind === "ground")).toBe(true);
    expect(
      LEVEL_01.world.filter(({ kind }) => kind === "platform").length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("reports duplicate and out-of-bounds geometry", () => {
    const invalid: LevelLayout = {
      ...LEVEL_01,
      world: [
        LEVEL_01.world[0],
        { ...LEVEL_01.world[0], x: LEVEL_01.bounds.width },
      ],
    };

    expect(validateLevelLayout(invalid, VIEWPORT)).toEqual([
      "duplicate geometry id: left-wall",
      "left-wall must stay inside level bounds",
    ]);
  });
});
