import { describe, expect, it, vi } from "vitest";

vi.mock("phaser", () => {
  class Body {
    velocity = { x: 0, y: 0 };
    blocked = { left: false, right: false, down: false };
    touching = { left: false, right: false, down: false };
    enable = true;

    setCollideWorldBounds() {
      return this;
    }

    setVelocity(x: number, y: number) {
      this.velocity = { x, y };
      return this;
    }

    setVelocityX(x: number) {
      this.velocity.x = x;
      return this;
    }
  }

  class Rectangle {
    body?: Body;
    active = true;
    visible = true;

    constructor(
      readonly scene: unknown,
      public x: number,
      public y: number,
      readonly width: number,
      readonly height: number,
      readonly color: number,
    ) {}

    setActive(active: boolean) {
      this.active = active;
      return this;
    }

    setVisible(visible: boolean) {
      this.visible = visible;
      return this;
    }
  }

  class GeomRectangle {
    constructor(
      readonly x: number,
      readonly y: number,
      readonly width: number,
      readonly height: number,
    ) {}
  }

  return {
    default: {
      GameObjects: { Rectangle },
      Physics: { Arcade: { Body } },
      Geom: { Rectangle: GeomRectangle },
    },
  };
});

import Phaser from "phaser";
import type { Damageable, EntityKind, Vec2 } from "../../src/contracts/domain";
import { ENEMY_STATE } from "../../src/contracts/states";
import { ChaseEnemy, PatrolEnemy } from "../../src/entities/enemies";
import { GameEventBus } from "../../src/game/GameEventBus";
import { DEFAULT_GAME_CONFIG } from "../../src/game/config";
import { DamageSystem } from "../../src/systems/DamageSystem";

type TestBody = {
  velocity: { x: number; y: number };
  blocked: { left: boolean; right: boolean; down: boolean };
  touching: { left: boolean; right: boolean; down: boolean };
  enable: boolean;
};

const scene = {
  add: { existing: vi.fn() },
  physics: {
    add: {
      existing: (object: { body?: unknown }) => {
        object.body = new Phaser.Physics.Arcade.Body(
          {} as Phaser.Physics.Arcade.World,
          {} as Phaser.GameObjects.GameObject,
        );
      },
    },
  },
};

const visual = { widthPx: 32, heightPx: 32, color: 0x00ff00 };

const patrol = (id: string, initialDirection: -1 | 1 = -1) =>
  new PatrolEnemy(
    scene as never,
    {
      id,
      x: 100,
      y: 200,
      visual,
      patrolLeftXPx: 50,
      patrolRightXPx: 150,
      initialDirection,
    },
    DEFAULT_GAME_CONFIG,
  );

class Target implements Damageable {
  readonly kind: EntityKind = "player";
  readonly position: Vec2;
  health = 5;
  invulnerableUntil = 0;
  knockback: Vec2 = { x: 0, y: 0 };
  state: "idle" | "hurt" | "dead" = "idle";

  constructor(
    readonly id: string,
    x: number,
  ) {
    this.position = { x, y: 200 };
  }

  getHealth() {
    return { currentHealth: this.health, maxHealth: 5 };
  }

  isAlive() {
    return this.health > 0;
  }

  isInvulnerable(atMs: number) {
    return atMs < this.invulnerableUntil;
  }

  commitDamage(amount: number) {
    const previousHealth = this.health;
    this.health = Math.max(0, this.health - amount);
    return {
      previousHealth,
      currentHealth: this.health,
      maxHealth: 5,
      appliedDamage: previousHealth - this.health,
    };
  }

  grantInvulnerability(untilMs: number) {
    this.invulnerableUntil = untilMs;
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

const bodyOf = (enemy: PatrolEnemy | ChaseEnemy) =>
  enemy.body as unknown as TestBody;

describe("PatrolEnemy", () => {
  it("reverses at patrol limits and walls", () => {
    const enemy = patrol("patrol-1");
    enemy.update();
    expect(bodyOf(enemy).velocity.x).toBe(
      -DEFAULT_GAME_CONFIG.enemies.patrol.moveSpeedPxPerSecond,
    );

    enemy.x = 50;
    enemy.update();
    expect(bodyOf(enemy).velocity.x).toBe(
      DEFAULT_GAME_CONFIG.enemies.patrol.moveSpeedPxPerSecond,
    );

    enemy.x = 100;
    bodyOf(enemy).blocked.right = true;
    enemy.update();
    expect(bodyOf(enemy).velocity.x).toBe(
      -DEFAULT_GAME_CONFIG.enemies.patrol.moveSpeedPxPerSecond,
    );
  });

  it("keeps direction, health, and state independent per instance", () => {
    const left = patrol("patrol-left", -1);
    const right = patrol("patrol-right", 1);

    left.update();
    right.update();
    left.commitDamage(1);

    expect(bodyOf(left).velocity.x).toBeLessThan(0);
    expect(bodyOf(right).velocity.x).toBeGreaterThan(0);
    expect(left.getHealth().currentHealth).toBe(1);
    expect(right.getHealth().currentHealth).toBe(2);
  });

  it("emits contact DamageRequest values without directly changing health", () => {
    const enemy = patrol("patrol-contact");
    const target = new Target("player", 40);

    expect(enemy.createContactDamageRequest(target, 123)).toMatchObject({
      target,
      amount: DEFAULT_GAME_CONFIG.enemies.patrol.contactDamage,
      cause: "enemy-contact",
      sourceId: "patrol-contact",
      nowMs: 123,
      knockbackVelocity: {
        x: -DEFAULT_GAME_CONFIG.combat.contactKnockbackXPxPerSecond,
        y: -DEFAULT_GAME_CONFIG.combat.contactKnockbackYPxPerSecond,
      },
    });
    expect(target.health).toBe(5);
  });
});

describe("ChaseEnemy", () => {
  const chase = () =>
    new ChaseEnemy(
      scene as never,
      { id: "chase-1", x: 100, y: 200, visual },
      DEFAULT_GAME_CONFIG,
    );

  it("detects, chases, disengages, and returns to its spawn", () => {
    const enemy = chase();

    enemy.update({ id: "player", position: { x: 300, y: 200 } }, 0);
    expect(enemy.enemyState).toBe(ENEMY_STATE.CHASE);
    expect(bodyOf(enemy).velocity.x).toBeGreaterThan(0);

    enemy.x = 200;
    enemy.update({ id: "player", position: { x: 600, y: 200 } }, 10);
    expect(enemy.enemyState).toBe(ENEMY_STATE.PATROL);
    expect(bodyOf(enemy).velocity.x).toBeLessThan(0);

    enemy.x = 100;
    enemy.update({ id: "player", position: { x: 600, y: 200 } }, 20);
    expect(enemy.enemyState).toBe(ENEMY_STATE.IDLE);
    expect(bodyOf(enemy).velocity.x).toBe(0);
  });

  it("emits one melee request per cooldown-qualified attack", () => {
    const enemy = chase();
    const target = new Target("player", 120);

    enemy.update(target, 100);
    expect(enemy.enemyState).toBe(ENEMY_STATE.ATTACK);
    expect(enemy.takeAttackDamageRequest(target, 100)).toMatchObject({
      amount: DEFAULT_GAME_CONFIG.enemies.chase.attackDamage,
      cause: "enemy-attack",
      attackId: "chase-1:melee:1",
    });
    expect(enemy.takeAttackDamageRequest(target, 101)).toBeNull();

    enemy.update(target, 999);
    expect(enemy.enemyState).toBe(ENEMY_STATE.CHASE);
    expect(enemy.takeAttackDamageRequest(target, 999)).toBeNull();
    enemy.update(target, 1000);
    expect(enemy.takeAttackDamageRequest(target, 1000)).toMatchObject({
      attackId: "chase-1:melee:2",
    });
  });

  it("integrates with DamageSystem for hurt and death", () => {
    const enemy = chase();
    const damageSystem = new DamageSystem(new GameEventBus(), 0);

    expect(
      damageSystem.applyDamage({
        target: enemy,
        amount: 1,
        cause: "player-attack",
        sourceId: "player",
        attackId: "player:attack:1",
        knockbackVelocity: { x: 50, y: -20 },
        nowMs: 0,
      }),
    ).toMatchObject({ applied: true, killed: false });
    expect(enemy.enemyState).toBe(ENEMY_STATE.HURT);
    expect(bodyOf(enemy).velocity).toEqual({ x: 50, y: -20 });

    expect(
      damageSystem.applyDamage({
        target: enemy,
        amount: 99,
        cause: "player-attack",
        sourceId: "player",
        attackId: "player:attack:2",
        knockbackVelocity: { x: 0, y: 0 },
        nowMs: 1,
      }),
    ).toMatchObject({ applied: true, killed: true });
    expect(enemy.enemyState).toBe(ENEMY_STATE.DEAD);
    expect(bodyOf(enemy).enable).toBe(false);
    expect(enemy.active).toBe(false);
    expect(enemy.visible).toBe(false);
  });
});
