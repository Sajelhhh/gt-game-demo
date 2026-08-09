import { describe, expect, it, vi } from "vitest";

import { Health } from "../../src/components/Health";
import type { Damageable, EntityKind, Vec2 } from "../../src/contracts/domain";
import { GameEventBus } from "../../src/game/GameEventBus";
import type { HazardZone } from "../../src/level/level01";
import { CheckpointSystem } from "../../src/systems/CheckpointSystem";
import { DamageSystem } from "../../src/systems/DamageSystem";
import {
  createHazardDamageRequest,
  HazardInteraction,
} from "../../src/systems/HazardInteraction";

class HazardTarget implements Damageable {
  readonly kind: EntityKind = "player";
  readonly health: Health;
  invulnerableUntilMs = 0;
  knockback: Vec2 | null = null;
  state: "idle" | "hurt" | "dead" = "idle";

  constructor(
    readonly id: string,
    readonly position: Vec2,
    maxHealth = 5,
  ) {
    this.health = new Health(maxHealth);
  }

  getHealth() {
    return this.health.snapshot;
  }

  isAlive() {
    return this.health.isAlive;
  }

  isInvulnerable(atMs: number) {
    return atMs < this.invulnerableUntilMs;
  }

  commitDamage(amount: number) {
    return this.health.commitDamage(amount);
  }

  grantInvulnerability(untilMs: number) {
    this.invulnerableUntilMs = untilMs;
  }

  applyKnockback(velocity: Vec2) {
    this.knockback = velocity;
  }

  enterHurtState() {
    this.state = "hurt";
  }

  enterDeadState() {
    this.state = "dead";
  }
}

const spike: HazardZone = {
  id: "spike-1",
  kind: "spike",
  damage: 1,
  x: 100,
  y: 600,
  width: 80,
  height: 40,
};

const pit: HazardZone = {
  ...spike,
  id: "pit-1",
  kind: "pit",
};

describe("hazard interactions", () => {
  it("creates a one-health spike request with directional knockback", () => {
    const target = new HazardTarget("player", { x: 90, y: 600 });

    expect(createHazardDamageRequest(spike, target, 20)).toMatchObject({
      target,
      amount: 1,
      cause: "spike",
      sourceId: "spike-1",
      knockbackVelocity: { x: -180, y: -160 },
      nowMs: 20,
    });
  });

  it("lets DamageSystem enforce the 800ms immunity window for spikes", () => {
    const bus = new GameEventBus();
    const system = new HazardInteraction(
      new DamageSystem(bus),
      new CheckpointSystem(bus, { x: 40, y: 80 }),
    );
    const target = new HazardTarget("player", { x: 90, y: 600 });
    const relocate = vi.fn();

    expect(
      system.handle({ hazard: spike, target, nowMs: 100, relocate }).damage,
    ).toMatchObject({ applied: true });
    expect(
      system.handle({ hazard: spike, target, nowMs: 899, relocate }).damage,
    ).toEqual({ applied: false, reason: "invulnerable" });
    expect(target.getHealth().currentHealth).toBe(4);
    expect(relocate).not.toHaveBeenCalled();
  });

  it("moves a surviving pit victim to the latest checkpoint", () => {
    const bus = new GameEventBus();
    const checkpoints = new CheckpointSystem(bus, { x: 40, y: 80 });
    checkpoints.reach(
      "player",
      { id: "checkpoint-1", respawnPosition: { x: 500, y: 300 } },
      10,
    );
    const system = new HazardInteraction(new DamageSystem(bus), checkpoints);
    const target = new HazardTarget("player", { x: 120, y: 680 }, 2);
    const relocate = vi.fn();

    expect(
      system.handle({ hazard: pit, target, nowMs: 100, relocate }),
    ).toMatchObject({
      damage: { applied: true, killed: false },
      relocated: true,
      respawnPosition: { x: 500, y: 300 },
    });
    expect(target.getHealth().currentHealth).toBe(1);
    expect(relocate).toHaveBeenCalledWith({ x: 500, y: 300 });
  });

  it("does not relocate when pit damage is fatal", () => {
    const bus = new GameEventBus();
    const system = new HazardInteraction(
      new DamageSystem(bus),
      new CheckpointSystem(bus, { x: 40, y: 80 }),
    );
    const target = new HazardTarget("player", { x: 120, y: 680 }, 1);
    const relocate = vi.fn();

    expect(
      system.handle({ hazard: pit, target, nowMs: 100, relocate }),
    ).toMatchObject({
      damage: { applied: true, killed: true },
      relocated: false,
    });
    expect(relocate).not.toHaveBeenCalled();
  });
});
