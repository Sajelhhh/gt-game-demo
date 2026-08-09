import Phaser from "phaser";

import { Health } from "../../components/Health";
import {
  createEnemyStateMachine,
  ENEMY_STATE,
  type EnemyState,
} from "../../contracts/states";
import type {
  Damageable,
  DamageRequest,
  EntityId,
  EntityKind,
  Facing,
  HealthChange,
  HealthSnapshot,
  Vec2,
} from "../../contracts/domain";
import type { GameConfig } from "../../game/config";

export type EnemyVisual = Readonly<{
  widthPx: number;
  heightPx: number;
  color: number;
  textureKey: string;
  displayWidthPx: number;
  displayHeightPx: number;
  offsetYPx: number;
}>;

export type EnemySpawn = Readonly<{
  id: EntityId;
  x: number;
  y: number;
  visual: EnemyVisual;
}>;

/**
 * Common Arcade entity and Damageable adapter for the browser-demo enemies.
 * Scene code owns collider/overlap registration and passes emitted requests to
 * DamageSystem; enemies never mutate another entity's health directly.
 */
export abstract class BaseEnemy
  extends Phaser.GameObjects.Rectangle
  implements Damageable
{
  abstract readonly kind: Extract<EntityKind, "patrol-enemy" | "chase-enemy">;

  readonly id: EntityId;
  protected readonly stateMachine = createEnemyStateMachine();
  protected facingValue: Facing = "left";
  private readonly characterImage: Phaser.GameObjects.Image;
  private readonly visualOffsetYPx: number;
  private readonly health: Health;
  private invulnerableUntilMs = 0;

  protected constructor(
    scene: Phaser.Scene,
    spawn: EnemySpawn,
    maxHealth: number,
    protected readonly gameConfig: Readonly<GameConfig>,
  ) {
    super(
      scene,
      spawn.x,
      spawn.y,
      spawn.visual.widthPx,
      spawn.visual.heightPx,
      spawn.visual.color,
      0,
    );
    this.id = spawn.id;
    this.health = new Health(maxHealth);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.visualOffsetYPx = spawn.visual.offsetYPx;
    this.characterImage = scene.add
      .image(spawn.x, spawn.y + spawn.visual.offsetYPx, spawn.visual.textureKey)
      .setDisplaySize(spawn.visual.displayWidthPx, spawn.visual.displayHeightPx)
      .setDepth(4);
    this.arcadeBody.setCollideWorldBounds(true);
  }

  get enemyState(): EnemyState {
    return this.stateMachine.state;
  }

  get facing(): Facing {
    return this.facingValue;
  }

  get position(): Vec2 {
    return { x: this.x, y: this.y };
  }

  /** Pass to the Scene's World/Enemy Arcade collider. */
  get worldCollisionTarget(): Phaser.Types.Physics.Arcade.ArcadeColliderType {
    return this;
  }

  /** Pass to Player/Enemy overlap registration for contact damage. */
  get contactCollisionTarget(): Phaser.Types.Physics.Arcade.ArcadeColliderType {
    return this;
  }

  getHealth(): HealthSnapshot {
    return this.health.snapshot;
  }

  isAlive(): boolean {
    return this.health.isAlive;
  }

  isInvulnerable(atMs: number): boolean {
    return atMs < this.invulnerableUntilMs;
  }

  commitDamage(amount: number): HealthChange {
    return this.health.commitDamage(amount);
  }

  grantInvulnerability(untilMs: number): void {
    this.invulnerableUntilMs = Math.max(this.invulnerableUntilMs, untilMs);
  }

  applyKnockback(velocity: Vec2): void {
    this.arcadeBody.setVelocity(velocity.x, velocity.y);
  }

  enterHurtState(): void {
    if (this.isAlive()) this.stateMachine.transition(ENEMY_STATE.HURT);
  }

  enterDeadState(): void {
    if (this.stateMachine.state !== ENEMY_STATE.DEAD) {
      this.stateMachine.transition(ENEMY_STATE.DEAD);
    }
    this.arcadeBody.setVelocity(0, 0);
    this.arcadeBody.enable = false;
    this.setActive(false);
    this.setVisible(false);
    this.characterImage.setVisible(false);
  }

  /**
   * Contact callbacks call this and forward the result to DamageSystem.
   * DamageSystem supplies the target's normal invulnerability window.
   */
  createContactDamageRequest(
    target: Damageable,
    nowMs: number,
    amount: number,
  ): DamageRequest {
    const direction = target.position.x < this.x ? -1 : 1;
    return {
      target,
      amount,
      cause: "enemy-contact",
      sourceId: this.id,
      knockbackVelocity: {
        x: direction * this.gameConfig.combat.contactKnockbackXPxPerSecond,
        y: -this.gameConfig.combat.contactKnockbackYPxPerSecond,
      },
      nowMs,
    };
  }

  protected faceVelocity(velocityX: number): void {
    if (velocityX < 0) this.facingValue = "left";
    if (velocityX > 0) this.facingValue = "right";
  }

  updateVisual(): void {
    this.characterImage
      .setPosition(this.x, this.y + this.visualOffsetYPx)
      .setFlipX(this.facingValue === "right");
  }

  protected recoverFromHurt(nextState: EnemyState): boolean {
    if (this.stateMachine.state !== ENEMY_STATE.HURT) return false;
    this.stateMachine.transition(nextState);
    return true;
  }

  protected get arcadeBody(): Phaser.Physics.Arcade.Body {
    const body = this.body;
    if (!(body instanceof Phaser.Physics.Arcade.Body)) {
      throw new Error("Enemy requires an Arcade Physics body");
    }
    return body;
  }
}
