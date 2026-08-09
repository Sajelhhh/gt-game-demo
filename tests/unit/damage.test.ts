import { describe, expect, it, vi } from "vitest";

import { Health } from "../../src/components/Health";
import type { Damageable, EntityKind, Vec2 } from "../../src/contracts/domain";
import type { GameEventMap } from "../../src/contracts/events";
import { GameEventBus } from "../../src/game/GameEventBus";
import { DamageSystem } from "../../src/systems/DamageSystem";

class TestDamageable implements Damageable {
  readonly kind: EntityKind = "player";
  readonly position = { x: 24, y: 48 };
  readonly health: Health;
  invulnerableUntilMs = 0;
  knockback: Vec2 | null = null;
  state: "idle" | "hurt" | "dead" = "idle";

  constructor(
    readonly id: string,
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

const damage = (target: Damageable, nowMs: number, amount = 1) => ({
  target,
  amount,
  cause: "enemy-contact" as const,
  sourceId: "enemy-1",
  attackId: null,
  knockbackVelocity: { x: -160, y: -120 },
  nowMs,
});

describe("DamageSystem", () => {
  it("applies damage, knockback, hurt, and the configured invulnerability", () => {
    const bus = new GameEventBus();
    const system = new DamageSystem(bus);
    const target = new TestDamageable("player");

    expect(system.applyDamage(damage(target, 100))).toMatchObject({
      applied: true,
      killed: false,
    });
    expect(target.getHealth().currentHealth).toBe(4);
    expect(target.knockback).toEqual({ x: -160, y: -120 });
    expect(target.invulnerableUntilMs).toBe(900);
    expect(target.state).toBe("hurt");
    expect(system.applyDamage(damage(target, 899))).toEqual({
      applied: false,
      reason: "invulnerable",
    });
    expect(system.applyDamage(damage(target, 900))).toMatchObject({
      applied: true,
    });
  });

  it("emits successful damage events in order and enters dead exactly once", () => {
    const bus = new GameEventBus();
    const system = new DamageSystem(bus, 800);
    const target = new TestDamageable("player", 2);
    const events: (keyof GameEventMap)[] = [];
    bus.on("damage-applied", () => events.push("damage-applied"));
    bus.on("health-changed", () => events.push("health-changed"));
    bus.on("entity-died", () => events.push("entity-died"));

    expect(system.applyDamage(damage(target, 50, 8))).toMatchObject({
      applied: true,
      killed: true,
      change: { appliedDamage: 2, currentHealth: 0 },
    });
    expect(events).toEqual(["damage-applied", "health-changed", "entity-died"]);
    expect(target.state).toBe("dead");
    expect(system.applyDamage(damage(target, 1000))).toEqual({
      applied: false,
      reason: "dead",
    });
    expect(events).toHaveLength(3);
  });

  it("rejects duplicate attack-target pairs without emitting events", () => {
    const bus = new GameEventBus();
    const system = new DamageSystem(bus, 0);
    const target = new TestDamageable("player");
    const listener = vi.fn();
    bus.on("damage-applied", listener);
    const request = { ...damage(target, 0), attackId: "attack-1" };

    expect(system.applyDamage(request)).toMatchObject({ applied: true });
    expect(system.applyDamage({ ...request, nowMs: 1 })).toEqual({
      applied: false,
      reason: "duplicate-attack",
    });
    system.endAttack("attack-1");
    expect(system.applyDamage({ ...request, nowMs: 2 })).toMatchObject({
      applied: true,
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("announces spawn health without damage or death events", () => {
    const bus = new GameEventBus();
    const system = new DamageSystem(bus, 800);
    const target = new TestDamageable("player");
    const healthChanged = vi.fn();
    const damaged = vi.fn();
    bus.on("health-changed", healthChanged);
    bus.on("damage-applied", damaged);

    system.announceHealth(target, "spawn");

    expect(healthChanged).toHaveBeenCalledWith({
      entityId: "player",
      entityKind: "player",
      previousHealth: 5,
      currentHealth: 5,
      maxHealth: 5,
      delta: 0,
      cause: "spawn",
    });
    expect(damaged).not.toHaveBeenCalled();
  });
});
