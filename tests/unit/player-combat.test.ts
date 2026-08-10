import { describe, expect, it, vi } from "vitest";

import { Health } from "../../src/components/Health";
import { AttackHitbox } from "../../src/combat/AttackHitbox";
import { PlayerCombat } from "../../src/combat/PlayerCombat";
import type { Damageable, EntityKind, Vec2 } from "../../src/contracts/domain";
import { GameEventBus } from "../../src/game/GameEventBus";
import { DEFAULT_GAME_CONFIG } from "../../src/game/config";
import type { AttackInput } from "../../src/input/AttackInput";
import { DamageSystem } from "../../src/systems/DamageSystem";

class TestInput implements AttackInput {
  pressed = false;

  readAttackPressed(): boolean {
    const pressed = this.pressed;
    this.pressed = false;
    return pressed;
  }
}

class TestEnemy implements Damageable {
  readonly kind: EntityKind = "patrol-enemy";
  readonly position = { x: 128, y: 80 };
  private readonly health = new Health(5);
  private invulnerableUntilMs = 0;
  knockback: Vec2 | null = null;

  constructor(readonly id: string) {}

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

  enterHurtState() {}
  enterDeadState() {}
}

const source = {
  id: "player-1",
  position: { x: 100, y: 80 },
  facing: "right" as const,
};
const targetBounds = {
  center: { x: 128, y: 80 },
  widthPx: 20,
  heightPx: 20,
};

const setup = () => {
  const input = new TestInput();
  const bus = new GameEventBus();
  const damageSystem = new DamageSystem(bus, 0);
  const endAttack = vi.spyOn(damageSystem, "endAttack");
  const combat = new PlayerCombat(
    input,
    damageSystem,
    bus,
    DEFAULT_GAME_CONFIG.combat.playerMelee,
    10,
  );
  return { input, bus, damageSystem, endAttack, combat };
};

describe("AttackHitbox", () => {
  it("mirrors its configured horizontal offset with facing", () => {
    const config = { offsetXPx: 28, widthPx: 36, heightPx: 24 };

    expect(
      AttackHitbox.fromOrigin(source.position, "right", config).center.x,
    ).toBe(128);
    expect(
      AttackHitbox.fromOrigin(source.position, "left", config).center.x,
    ).toBe(72);
  });

  it("detects touching and separated centre-based bounds", () => {
    const attack = { center: { x: 10, y: 10 }, widthPx: 10, heightPx: 10 };
    expect(
      AttackHitbox.overlaps(attack, {
        center: { x: 20, y: 10 },
        widthPx: 10,
        heightPx: 10,
      }),
    ).toBe(true);
    expect(
      AttackHitbox.overlaps(attack, {
        center: { x: 21, y: 10 },
        widthPx: 10,
        heightPx: 10,
      }),
    ).toBe(false);
  });
});

describe("PlayerCombat", () => {
  it("starts on J/X input, emits the contract event, and exposes its hitbox", () => {
    const { input, bus, combat } = setup();
    const started = vi.fn();
    bus.on("attack-started", started);
    input.pressed = true;

    const presentation = combat.update(100, source);

    expect(presentation).toMatchObject({
      attackId: "player-1:melee:1",
      active: false,
      hitbox: { center: { x: 128, y: 80 }, widthPx: 36, heightPx: 24 },
    });
    expect(started).toHaveBeenCalledWith({
      attackId: "player-1:melee:1",
      attackKind: "player-melee",
      attackerId: "player-1",
      attackerKind: "player",
      facing: "right",
      origin: { x: 100, y: 80 },
      damage: 1,
      startedAtMs: 100,
    });
  });

  it("only damages during active frames and hits a target once per swing", () => {
    const { input, combat } = setup();
    const enemy = new TestEnemy("enemy-1");
    input.pressed = true;
    combat.update(100, source);

    expect(combat.tryHit(enemy, targetBounds, 119)).toEqual({
      attempted: false,
      reason: "inactive",
    });
    expect(combat.getPresentation(120)?.active).toBe(true);
    expect(combat.tryHit(enemy, targetBounds, 120)).toMatchObject({
      attempted: true,
      result: { applied: true },
    });
    expect(enemy.getHealth().currentHealth).toBe(4);
    expect(enemy.knockback).toEqual({ x: 180, y: -140 });
    expect(combat.tryHit(enemy, targetBounds, 130)).toEqual({
      attempted: false,
      reason: "duplicate-target",
    });
    expect(enemy.getHealth().currentHealth).toBe(4);
  });

  it("rejects targets outside the hitbox without consuming their hit", () => {
    const { input, combat } = setup();
    const enemy = new TestEnemy("enemy-1");
    input.pressed = true;
    combat.update(0, source);

    expect(
      combat.tryHit(
        enemy,
        { center: { x: 400, y: 80 }, widthPx: 20, heightPx: 20 },
        20,
      ),
    ).toEqual({ attempted: false, reason: "outside-hitbox" });
    expect(combat.tryHit(enemy, targetBounds, 20)).toMatchObject({
      attempted: true,
    });
  });

  it("ends the transient hitbox and enforces the 350 ms cooldown", () => {
    const { input, combat, endAttack } = setup();
    input.pressed = true;
    combat.update(0, source);

    input.pressed = true;
    expect(combat.update(50, source)).toBeNull();
    expect(endAttack).toHaveBeenCalledWith("player-1:melee:1");

    input.pressed = true;
    expect(combat.update(349, source)).toBeNull();

    input.pressed = true;
    expect(combat.update(350, source)?.attackId).toBe("player-1:melee:2");
  });

  it("uses enemy invulnerability shorter than the next melee cooldown", () => {
    const { input, combat } = setup();
    const enemy = new TestEnemy("enemy-1");

    input.pressed = true;
    combat.update(0, source);
    expect(combat.tryHit(enemy, targetBounds, 20)).toMatchObject({
      attempted: true,
      result: { applied: true },
    });

    input.pressed = true;
    combat.update(350, source);
    expect(combat.tryHit(enemy, targetBounds, 370)).toMatchObject({
      attempted: true,
      result: { applied: true },
    });
    expect(enemy.getHealth().currentHealth).toBe(3);
  });

  it("consumes but does not start attacks while player control is locked", () => {
    const { input, bus, combat } = setup();
    const started = vi.fn();
    bus.on("attack-started", started);

    input.pressed = true;
    expect(combat.update(0, source, false)).toBeNull();
    expect(started).not.toHaveBeenCalled();

    input.pressed = true;
    expect(combat.update(1, source, true)?.attackId).toBe("player-1:melee:1");
    expect(started).toHaveBeenCalledTimes(1);
  });

  it("snapshots facing and applies leftward knockback for a left attack", () => {
    const { input, combat } = setup();
    const enemy = new TestEnemy("enemy-1");
    const leftSource = {
      ...source,
      position: { x: 156, y: 80 },
      facing: "left" as const,
    };
    input.pressed = true;
    combat.update(0, leftSource);

    combat.tryHit(enemy, targetBounds, 20);

    expect(enemy.knockback).toEqual({ x: -180, y: -140 });
  });
});
