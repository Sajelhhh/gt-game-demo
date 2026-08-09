import { describe, expect, it } from "vitest";

import {
  LEVEL_01,
  validateLevelLayout,
  type LevelLayout,
} from "../../src/level/level01";
import {
  calculateBaseJumpHazardLimitPx,
  calculateJumpEnvelope,
} from "../../src/level/reachability";
import { DEFAULT_GAME_CONFIG } from "../../src/game/config";

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

  it("keeps every authored hazard below the configured jump envelope", () => {
    const playerWidthPx = 32;
    const motion = {
      moveSpeedPxPerSecond: DEFAULT_GAME_CONFIG.player.moveSpeedPxPerSecond,
      jumpSpeedPxPerSecond: DEFAULT_GAME_CONFIG.player.jumpSpeedPxPerSecond,
      gravityYPxPerSecondSquared: DEFAULT_GAME_CONFIG.physics.gravityY,
      airJumps: DEFAULT_GAME_CONFIG.player.airJumps,
    };
    const doubleJump = calculateJumpEnvelope(motion);
    const firstPit = LEVEL_01.hazards.find(({ id }) => id === "tutorial-pit")!;
    const tutorialGround = LEVEL_01.world.find(
      ({ id }) => id === "tutorial-ground",
    )!;
    const requiredRisePx = Math.max(0, tutorialGround.y - firstPit.y);
    const baseJumpHazardLimitPx = calculateBaseJumpHazardLimitPx(
      { ...motion, airJumps: 0 },
      requiredRisePx,
      playerWidthPx,
    );

    expect(requiredRisePx).toBe(0);
    expect(baseJumpHazardLimitPx).toBeCloseTo(125.67, 1);
    expect(baseJumpHazardLimitPx - firstPit.width).toBeGreaterThanOrEqual(60);

    for (const hazard of LEVEL_01.hazards) {
      expect(
        hazard.width + playerWidthPx,
        `${hazard.id} exceeds the double-jump horizontal envelope`,
      ).toBeLessThan(doubleJump.apexChainedDistancePx);
    }

    const route = [
      "tutorial-ground",
      "tutorial-step-1",
      "tutorial-step-2",
      "pit-landing",
      "combat-platform-1",
      "combat-platform-2",
      "challenge-platform-1",
      "challenge-platform-2",
      "checkpoint-shelf",
      "final-platform-1",
      "final-platform-2",
    ];
    const platforms = route.map(
      (id) => LEVEL_01.world.find((geometry) => geometry.id === id)!,
    );

    for (let index = 1; index < platforms.length; index += 1) {
      const from = platforms[index - 1];
      const to = platforms[index];
      const horizontalGapPx = Math.max(0, to.x - (from.x + from.width));
      const requiredRisePx = Math.max(0, from.y - to.y);

      expect(
        horizontalGapPx + playerWidthPx,
        `${from.id} -> ${to.id} is horizontally impossible`,
      ).toBeLessThan(doubleJump.apexChainedDistancePx);
      expect(
        requiredRisePx,
        `${from.id} -> ${to.id} is vertically impossible`,
      ).toBeLessThan(doubleJump.maximumRisePx);
    }
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
