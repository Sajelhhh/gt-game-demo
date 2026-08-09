import { describe, expect, it } from "vitest";

import {
  COLLISION_LAYER,
  COLLISION_MATRIX,
  PHYSICS_GROUP,
} from "../../src/contracts/collision";

describe("Arcade collision contract", () => {
  it("keeps exact string names and the six allowed interactions", () => {
    expect(COLLISION_LAYER).toEqual({ WORLD: "World", HAZARD: "Hazard" });
    expect(PHYSICS_GROUP).toEqual({
      PLAYER: "Player",
      ENEMY: "Enemy",
      PLAYER_ATTACK: "PlayerAttack",
      ENEMY_ATTACK: "EnemyAttack",
    });
    expect(COLLISION_MATRIX).toHaveLength(6);
    expect(
      COLLISION_MATRIX.filter(({ interaction }) => interaction === "collider"),
    ).toHaveLength(2);
    expect(
      COLLISION_MATRIX.filter(({ interaction }) => interaction === "overlap"),
    ).toHaveLength(4);
  });
});
