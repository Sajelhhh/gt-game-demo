import Phaser from "phaser";

import { ENEMY_STATE } from "../../contracts/states";
import type {
  Damageable,
  DamageRequest,
  EntityId,
  Vec2,
} from "../../contracts/domain";
import type { GameConfig } from "../../game/config";
import { BaseEnemy, type EnemySpawn } from "./BaseEnemy";

const ATTACK_FRAME_DURATION_MS = 1000 / 60;

export type ChaseTarget = Readonly<{
  id: EntityId;
  position: Vec2;
}>;

export type ChaseEnemySpawn = EnemySpawn;

export class ChaseEnemy extends BaseEnemy {
  readonly kind = "chase-enemy" as const;
  private readonly homeX: number;
  private nextAttackAtMs = 0;
  private attackSequence = 0;
  private attackStartedAtMs = Number.NEGATIVE_INFINITY;
  private pendingAttackId: string | null = null;

  constructor(
    scene: Phaser.Scene,
    spawn: ChaseEnemySpawn,
    gameConfig: Readonly<GameConfig>,
  ) {
    super(scene, spawn, gameConfig.enemies.chase.maxHealth, gameConfig);
    this.homeX = spawn.x;
  }

  update(target: ChaseTarget, nowMs: number): void {
    if (!this.isAlive()) return;
    if (this.isHurtStunned(nowMs)) {
      this.pendingAttackId = null;
      return;
    }
    this.recoverFromHurt(ENEMY_STATE.IDLE);

    if (this.enemyState === ENEMY_STATE.ATTACK) {
      if (!this.isAttackExpired(nowMs)) {
        this.arcadeBody.setVelocityX(0);
        return;
      }
      this.pendingAttackId = null;
      this.transitionTo(ENEMY_STATE.CHASE);
    }

    const distanceToTarget = Math.abs(target.position.x - this.x);
    const currentlyEngaged =
      this.enemyState === ENEMY_STATE.CHASE ||
      this.enemyState === ENEMY_STATE.ATTACK;
    const engageRange = currentlyEngaged
      ? this.gameConfig.enemies.chase.disengageRangePx
      : this.gameConfig.enemies.chase.detectionRangePx;

    if (distanceToTarget > engageRange) {
      this.pendingAttackId = null;
      this.returnHome();
      return;
    }

    if (
      distanceToTarget <= this.gameConfig.enemies.chase.attackRangePx &&
      nowMs >= this.nextAttackAtMs
    ) {
      this.beginAttack(nowMs);
      return;
    }

    this.pendingAttackId = null;
    this.transitionTo(ENEMY_STATE.CHASE);
    const direction = target.position.x < this.x ? -1 : 1;
    const velocityX =
      direction * this.gameConfig.enemies.chase.moveSpeedPxPerSecond;
    this.arcadeBody.setVelocityX(velocityX);
    this.faceVelocity(velocityX);
  }

  createContactDamageRequest(target: Damageable, nowMs: number): DamageRequest {
    return super.createContactDamageRequest(
      target,
      nowMs,
      this.gameConfig.enemies.chase.contactDamage,
    );
  }

  /**
   * Returns one request for the current attack lifecycle. Scene overlap code
   * forwards it to DamageSystem; calls outside attack state return null.
   */
  takeAttackDamageRequest(
    target: Damageable,
    nowMs: number,
  ): DamageRequest | null {
    if (
      !this.isAlive() ||
      this.enemyState !== ENEMY_STATE.ATTACK ||
      this.pendingAttackId === null ||
      !this.isAttackDamageWindowActive(nowMs)
    ) {
      return null;
    }

    const attackId = this.pendingAttackId;
    this.pendingAttackId = null;
    const direction = target.position.x < this.x ? -1 : 1;
    return {
      target,
      amount: this.gameConfig.enemies.chase.attackDamage,
      cause: "enemy-attack",
      sourceId: this.id,
      attackId,
      knockbackVelocity: {
        x: direction * this.gameConfig.enemies.chase.knockbackXPxPerSecond,
        y: -this.gameConfig.enemies.chase.knockbackYPxPerSecond,
      },
      nowMs,
    };
  }

  /** World-space geometry for an EnemyAttack overlap body owned by the Scene. */
  get attackBounds(): Phaser.Geom.Rectangle {
    const config = this.gameConfig.enemies.chase;
    const centerX =
      this.x + (this.facing === "left" ? -1 : 1) * config.hitboxOffsetXPx;
    return new Phaser.Geom.Rectangle(
      centerX - config.hitboxWidthPx / 2,
      this.y - config.hitboxHeightPx / 2,
      config.hitboxWidthPx,
      config.hitboxHeightPx,
    );
  }

  private beginAttack(nowMs: number): void {
    // The shared transition contract intentionally disallows idle -> attack.
    // Entering chase first keeps the AI transition observable and valid.
    if (this.enemyState === ENEMY_STATE.IDLE) {
      this.stateMachine.transition(ENEMY_STATE.CHASE);
    }
    this.transitionTo(ENEMY_STATE.ATTACK);
    this.arcadeBody.setVelocityX(0);
    this.attackSequence += 1;
    this.attackStartedAtMs = nowMs;
    this.pendingAttackId = `${this.id}:melee:${this.attackSequence}`;
    this.nextAttackAtMs =
      nowMs + this.gameConfig.enemies.chase.attackCooldownMs;
  }

  private isAttackDamageWindowActive(nowMs: number): boolean {
    const elapsedMs = nowMs - this.attackStartedAtMs;
    const config = this.gameConfig.enemies.chase;
    return (
      elapsedMs >= config.activeFrameStart * ATTACK_FRAME_DURATION_MS &&
      elapsedMs < (config.activeFrameEnd + 1) * ATTACK_FRAME_DURATION_MS
    );
  }

  private isAttackExpired(nowMs: number): boolean {
    return (
      nowMs - this.attackStartedAtMs >=
      (this.gameConfig.enemies.chase.activeFrameEnd + 1) *
        ATTACK_FRAME_DURATION_MS
    );
  }

  private returnHome(): void {
    const distanceHome = this.homeX - this.x;
    if (Math.abs(distanceHome) <= 1) {
      this.transitionTo(ENEMY_STATE.IDLE);
      this.arcadeBody.setVelocityX(0);
      return;
    }

    this.transitionTo(ENEMY_STATE.PATROL);
    const direction = distanceHome < 0 ? -1 : 1;
    const velocityX =
      direction * this.gameConfig.enemies.chase.moveSpeedPxPerSecond;
    this.arcadeBody.setVelocityX(velocityX);
    this.faceVelocity(velocityX);
  }

  private transitionTo(next: "idle" | "patrol" | "chase" | "attack"): void {
    if (this.enemyState === next) return;
    this.stateMachine.transition(next);
  }
}
