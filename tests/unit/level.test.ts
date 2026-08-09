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

  it("authors readable hazards, a safe checkpoint and a goal trigger", () => {
    expect(LEVEL_01.hazards.some(({ kind }) => kind === "spike")).toBe(true);
    expect(LEVEL_01.hazards.some(({ kind }) => kind === "pit")).toBe(true);
    expect(LEVEL_01.checkpoints).toHaveLength(1);
    expect(LEVEL_01.goal.id).toBe("level-goal");
    expect(
      LEVEL_01.hazards.some(
        (hazard) =>
          LEVEL_01.playerSpawn.x >= hazard.x &&
          LEVEL_01.playerSpawn.x <= hazard.x + hazard.width &&
          LEVEL_01.playerSpawn.y >= hazard.y &&
          LEVEL_01.playerSpawn.y <= hazard.y + hazard.height,
      ),
    ).toBe(false);
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

  it("rejects unsafe spawn and checkpoint positions", () => {
    const spike = LEVEL_01.hazards.find(({ kind }) => kind === "spike")!;
    const invalid: LevelLayout = {
      ...LEVEL_01,
      playerSpawn: { x: spike.x, y: spike.y },
      checkpoints: [
        {
          ...LEVEL_01.checkpoints[0],
          respawnPosition: { x: spike.x, y: spike.y },
        },
      ],
    };

    expect(validateLevelLayout(invalid, VIEWPORT)).toContain(
      "player spawn must not overlap a hazard",
    );
    expect(validateLevelLayout(invalid, VIEWPORT)).toContain(
      "checkpoint-1 respawn position must not overlap a hazard",
    );
  });
});
