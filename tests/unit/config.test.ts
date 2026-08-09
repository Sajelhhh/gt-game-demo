import { describe, expect, it } from "vitest";

import {
  DEFAULT_GAME_CONFIG,
  validateGameConfig,
  type GameConfig,
} from "../../src/game/config";

describe("DEFAULT_GAME_CONFIG", () => {
  it("matches the frozen MVP contract", () => {
    expect(DEFAULT_GAME_CONFIG.render).toMatchObject({
      widthPx: 1280,
      heightPx: 720,
      backgroundColor: "#10131f",
      pixelArt: true,
    });
    expect(DEFAULT_GAME_CONFIG.physics.gravityY).toBe(1200);
    expect(DEFAULT_GAME_CONFIG.player.maxHealth).toBe(5);
    expect(DEFAULT_GAME_CONFIG.player.moveSpeedPxPerSecond).toBe(220);
    expect(DEFAULT_GAME_CONFIG.player.jumpSpeedPxPerSecond).toBe(430);
    expect(DEFAULT_GAME_CONFIG.player.airJumps).toBe(1);
    expect(DEFAULT_GAME_CONFIG.combat.playerMelee.cooldownMs).toBe(350);
    expect(DEFAULT_GAME_CONFIG.level.id).toBe("level-01");
    expect(validateGameConfig(DEFAULT_GAME_CONFIG)).toEqual([]);
    expect(Object.isFrozen(DEFAULT_GAME_CONFIG)).toBe(true);
    expect(Object.isFrozen(DEFAULT_GAME_CONFIG.combat.playerMelee)).toBe(true);
  });

  it("reports invalid ranges without mutating the default", () => {
    const fixture = structuredClone(DEFAULT_GAME_CONFIG) as GameConfig;
    Object.assign(fixture.audio, { musicVolume: 2 });
    Object.assign(fixture.enemies.chase, {
      detectionRangePx: 400,
      disengageRangePx: 300,
    });

    expect(validateGameConfig(fixture)).toEqual([
      "audio.musicVolume must be between 0 and 1",
      "enemies.chase disengage range must cover detection range",
    ]);
    expect(DEFAULT_GAME_CONFIG.audio.musicVolume).toBe(0.6);
  });
});
